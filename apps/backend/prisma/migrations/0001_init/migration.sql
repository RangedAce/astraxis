CREATE TYPE "QueueType" AS ENUM ('BUILDING', 'RESEARCH', 'SHIP');
CREATE TYPE "QueueStatus" AS ENUM ('PENDING', 'DONE', 'CANCELLED');

CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" STRING NOT NULL,
    "passwordHash" STRING NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "User_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "User_email_key" UNIQUE ("email")
);

CREATE TABLE "Universe" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" STRING NOT NULL,
    "speedFleet" INT4 NOT NULL DEFAULT 1,
    "speedBuild" INT4 NOT NULL DEFAULT 1,
    "speedResearch" INT4 NOT NULL DEFAULT 1,
    "isPeacefulDefault" BOOL NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "Universe_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Player" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "universeId" UUID NOT NULL,
    "nickname" STRING NOT NULL,
    "isPeaceful" BOOL NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "Player_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Player_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id"),
    CONSTRAINT "Player_universeId_fkey" FOREIGN KEY ("universeId") REFERENCES "Universe"("id")
);

CREATE TABLE "Planet" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "universeId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "galaxy" INT4 NOT NULL,
    "system" INT4 NOT NULL,
    "position" INT4 NOT NULL,
    "name" STRING NOT NULL,
    "temperature" INT4 NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "Planet_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Planet_universeId_fkey" FOREIGN KEY ("universeId") REFERENCES "Universe"("id"),
    CONSTRAINT "Planet_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id"),
    CONSTRAINT "Planet_universe_galaxy_system_position_key" UNIQUE ("universeId","galaxy","system","position")
);

CREATE TABLE "ResourceBalance" (
    "planetId" UUID NOT NULL,
    "metal" DECIMAL NOT NULL DEFAULT 0,
    "crystal" DECIMAL NOT NULL DEFAULT 0,
    "deuterium" DECIMAL NOT NULL DEFAULT 0,
    "lastCalculatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "ResourceBalance_pkey" PRIMARY KEY ("planetId"),
    CONSTRAINT "ResourceBalance_planetId_fkey" FOREIGN KEY ("planetId") REFERENCES "Planet"("id")
);

CREATE TABLE "Production" (
    "planetId" UUID NOT NULL,
    "metalPerHour" DECIMAL NOT NULL DEFAULT 0,
    "crystalPerHour" DECIMAL NOT NULL DEFAULT 0,
    "deutPerHour" DECIMAL NOT NULL DEFAULT 0,
    "energy" INT4 NOT NULL DEFAULT 0,
    "lastCalculatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "Production_pkey" PRIMARY KEY ("planetId"),
    CONSTRAINT "Production_planetId_fkey" FOREIGN KEY ("planetId") REFERENCES "Planet"("id")
);

CREATE TABLE "BuildingLevel" (
    "planetId" UUID NOT NULL,
    "buildingKey" STRING NOT NULL,
    "level" INT4 NOT NULL DEFAULT 0,
    CONSTRAINT "BuildingLevel_pkey" PRIMARY KEY ("planetId","buildingKey"),
    CONSTRAINT "BuildingLevel_planetId_fkey" FOREIGN KEY ("planetId") REFERENCES "Planet"("id")
);

CREATE TABLE "ResearchLevel" (
    "playerId" UUID NOT NULL,
    "techKey" STRING NOT NULL,
    "level" INT4 NOT NULL DEFAULT 0,
    CONSTRAINT "ResearchLevel_pkey" PRIMARY KEY ("playerId","techKey"),
    CONSTRAINT "ResearchLevel_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id")
);

CREATE TABLE "ShipCount" (
    "planetId" UUID NOT NULL,
    "shipKey" STRING NOT NULL,
    "count" INT4 NOT NULL DEFAULT 0,
    CONSTRAINT "ShipCount_pkey" PRIMARY KEY ("planetId","shipKey"),
    CONSTRAINT "ShipCount_planetId_fkey" FOREIGN KEY ("planetId") REFERENCES "Planet"("id")
);

CREATE TABLE "QueueItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "QueueType" NOT NULL,
    "planetId" UUID NULL,
    "playerId" UUID NOT NULL,
    "key" STRING NOT NULL,
    "levelOrQty" INT4 NOT NULL,
    "startAt" TIMESTAMPTZ NOT NULL,
    "endAt" TIMESTAMPTZ NOT NULL,
    "status" "QueueStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "QueueItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "QueueItem_planetId_fkey" FOREIGN KEY ("planetId") REFERENCES "Planet"("id"),
    CONSTRAINT "QueueItem_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id")
);

CREATE INDEX "QueueItem_playerId_type_status_idx" ON "QueueItem"("playerId","type","status");
CREATE INDEX "QueueItem_planetId_type_status_idx" ON "QueueItem"("planetId","type","status");
