CREATE TABLE "BuildingSetting" (
    "planetId" UUID NOT NULL,
    "buildingKey" STRING NOT NULL,
    "productionFactor" INT4 NOT NULL DEFAULT 100,
    CONSTRAINT "BuildingSetting_pkey" PRIMARY KEY ("planetId","buildingKey"),
    CONSTRAINT "BuildingSetting_planetId_fkey" FOREIGN KEY ("planetId") REFERENCES "Planet"("id")
);
