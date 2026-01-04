import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as argon from 'argon2';
import { UniverseService } from '../universe/universe.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly universeService: UniverseService
  ) {}

  private async signTokens(userId: string, playerId: string) {
    const payload = { sub: userId, playerId };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('jwt.secret'),
        expiresIn: this.config.get<string>('jwt.expiresIn')
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshExpiresIn')
      })
    ]);
    return { accessToken, refreshToken };
  }

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) {
      throw new BadRequestException('Email already registered');
    }
    const universe = dto.universeId
      ? await this.universeService.getUniverseById(dto.universeId)
      : await this.universeService.getDefaultUniverse();
    if (!universe) {
      throw new BadRequestException('Universe not initialized');
    }
    const passwordHash = await argon.hash(dto.password);
    const result = await this.prisma.serializableTransaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash
        }
      });
      const player = await tx.player.create({
        data: {
          userId: user.id,
          universeId: universe.id,
          nickname: dto.nickname,
          isPeaceful: universe.isPeacefulDefault
        }
      });
      const planet = await this.universeService.createStarterPlanet(tx, universe, player.id);
      return { user, player, planet };
    });
    const tokens = await this.signTokens(result.user.id, result.player.id);
    return { ...tokens, ...result };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        players: {
          include: { universe: true, planets: true },
          take: 1,
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await argon.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const player = user.players[0];
    if (!player) {
      throw new BadRequestException('Player not found for user');
    }
    const tokens = await this.signTokens(user.id, player.id);
    return { ...tokens, user, player };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret')
      });
      const tokens = await this.signTokens(payload.sub, payload.playerId);
      return tokens;
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        players: true
      }
    });
  }
}
