-- CreateTable
CREATE TABLE "ScanHistory" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,

    CONSTRAINT "ScanHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveredApp" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "vendor" TEXT,
    "path" TEXT,
    "cpeString" TEXT,
    "scanId" TEXT NOT NULL,

    CONSTRAINT "DiscoveredApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vulnerability" (
    "id" TEXT NOT NULL,
    "cveId" TEXT NOT NULL,
    "description" TEXT,
    "severity" TEXT,
    "score" DOUBLE PRECISION,
    "publishedAt" TIMESTAMP(3),
    "appId" TEXT NOT NULL,

    CONSTRAINT "Vulnerability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscoveredApp_name_version_key" ON "DiscoveredApp"("name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Vulnerability_cveId_appId_key" ON "Vulnerability"("cveId", "appId");

-- AddForeignKey
ALTER TABLE "DiscoveredApp" ADD CONSTRAINT "DiscoveredApp_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "ScanHistory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vulnerability" ADD CONSTRAINT "Vulnerability_appId_fkey" FOREIGN KEY ("appId") REFERENCES "DiscoveredApp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
