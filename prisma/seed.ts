import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding administrator user...");
  await prisma.user.upsert({
    where: { id: "usr_admin" },
    update: {},
    create: {
      id: "usr_admin",
      name: "Administrateur EASY",
      email: "admin@easy.ci",
      phone: "+225 0700000000",
      passwordHash: "$2b$10$1qsVWqEUayTQEB1g6Pb7T.OtQcxYLUvyFOlyHVs55xJUCJ935fvbq", // exact original hash from db.json
      role: "admin",
      createdAt: new Date().toISOString(),
    }
  });

  console.log("Seeding default vehicles...");
  const vehicles = [
    {
      id: "v_berline_n1",
      category: "berline-premium",
      brand: "Mercedes-Benz",
      name: "S-Class Hybrid",
      immatriculation: "2345-KI-01",
      batteryLevel: 98,
      status: "Disponible"
    },
    {
      id: "v_suv_n2",
      category: "suv-executive",
      brand: "Mercedes-Benz",
      name: "G-Class",
      immatriculation: "8765-TY-02",
      batteryLevel: 85,
      status: "Disponible"
    },
    {
      id: "v_suv_n3",
      category: "suv-prestige",
      brand: "Mercedes-Maybach",
      name: "GLS 600",
      immatriculation: "4321-OP-03",
      batteryLevel: 91,
      status: "Disponible"
    }
  ];

  for (const v of vehicles) {
    await prisma.vehicle.upsert({
      where: { id: v.id },
      update: {},
      create: v
    });
  }

  console.log("Seeding default drivers...");
  const drivers = [
    {
      id: "drv_koffi",
      name: "Koffi N'Guessan",
      phone: "+225 0707070707",
      email: "koffi.driver@easy.ci",
      status: "disponible"
    },
    {
      id: "drv_moussa",
      name: "Moussa Diakité",
      phone: "+225 0505050505",
      email: "moussa.driver@easy.ci",
      status: "disponible"
    }
  ];

  for (const d of drivers) {
    await prisma.driver.upsert({
      where: { id: d.id },
      update: {},
      create: d
    });
  }

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
