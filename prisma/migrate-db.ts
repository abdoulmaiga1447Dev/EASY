import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const DB_FILE = path.join(process.cwd(), "db.json");

async function main() {
  if (!fs.existsSync(DB_FILE)) {
    console.log("No db.json file found to migrate.");
    return;
  }

  console.log("Reading db.json...");
  const data = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));

  console.log("Cleaning existing database...");
  await prisma.tripLocation.deleteMany({});
  await prisma.shift.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.partner.deleteMany({});
  await prisma.quote.deleteMany({});
  await prisma.reservationOption.deleteMany({});
  await prisma.reservation.deleteMany({});
  await prisma.driver.deleteMany({});
  await prisma.vehicle.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Migrate Users
  if (data.users && Array.isArray(data.users)) {
    console.log(`Migrating ${data.users.length} users...`);
    for (const u of data.users) {
      await prisma.user.create({
        data: {
          id: u.id,
          name: u.name || "",
          email: u.email || "",
          phone: u.phone || "",
          passwordHash: u.passwordHash || "",
          role: u.role || "client",
          createdAt: u.createdAt || new Date().toISOString(),
          partnerType: u.partnerType || null,
          status: u.status || null,
          starRating: u.starRating || null,
          documents: u.documents ? JSON.stringify(u.documents) : null,
          rejectionReason: u.rejectionReason || null,
        },
      });
    }
  }

  // 2. Migrate Vehicles
  if (data.vehicles && Array.isArray(data.vehicles)) {
    console.log(`Migrating ${data.vehicles.length} vehicles...`);
    for (const v of data.vehicles) {
      await prisma.vehicle.create({
        data: {
          id: v.id,
          category: v.category || "berline-premium",
          brand: v.brand || "",
          name: v.name || "",
          immatriculation: v.immatriculation || "",
          batteryLevel: typeof v.batteryLevel === "number" ? v.batteryLevel : 100,
          status: v.status || "Disponible",
          photoFront: v.photoFront || null,
          photoBack: v.photoBack || null,
          photoLeft: v.photoLeft || null,
          photoRight: v.photoRight || null,
          maxSpeed: typeof v.maxSpeed === "number" ? v.maxSpeed : null,
          fuelConsumption: v.fuelConsumption || null,
          totalDistance: v.totalDistance || null,
        },
      });
    }
  }

  // 3. Migrate Drivers
  if (data.drivers && Array.isArray(data.drivers)) {
    console.log(`Migrating ${data.drivers.length} drivers...`);
    for (const d of data.drivers) {
      await prisma.driver.create({
        data: {
          id: d.id,
          userId: d.userId || null,
          name: d.name || "",
          phone: d.phone || "",
          email: d.email || "",
          photo: d.photo || null,
          availability: d.availability || d.status || null,
          status: d.status || "disponible",
          rating: typeof d.rating === "number" ? d.rating : null,
          vehicleId: d.vehicleId || null,
          shift: d.shift || null,
          createdAt: d.createdAt || new Date().toISOString(),
        },
      });
    }
  }

  // 4. Migrate Reservations
  if (data.reservations && Array.isArray(data.reservations)) {
    console.log(`Migrating ${data.reservations.length} reservations...`);
    for (const r of data.reservations) {
      await prisma.reservation.create({
        data: {
          id: r.id,
          userId: r.userId || "",
          driverId: r.driverId || null,
          vehicleId: r.vehicleId || "",
          departureDate: r.departureDate || "",
          departureTime: r.departureTime || "",
          pickup: r.pickup || "",
          destination: r.destination || "",
          formula: r.formula || "hourly",
          totalPrice: typeof r.totalPrice === "number" ? r.totalPrice : 0,
          status: r.status || "pending_assignment",
          segment: r.segment || "public",
          options: r.options ? JSON.stringify(r.options) : null,
          createdAt: r.createdAt || new Date().toISOString(),
        },
      });
    }
  }

  // 5. Migrate Reservation Options
  if (data.reservation_options && Array.isArray(data.reservation_options)) {
    console.log(`Migrating ${data.reservation_options.length} reservation options...`);
    for (const ro of data.reservation_options) {
      await prisma.reservationOption.create({
        data: {
          id: ro.id,
          reservationId: ro.reservationId || "",
          optionName: ro.optionName || "",
          price: typeof ro.price === "number" ? ro.price : 0,
        },
      });
    }
  }

  // 6. Migrate Quotes
  if (data.quotes && Array.isArray(data.quotes)) {
    console.log(`Migrating ${data.quotes.length} quotes...`);
    for (const q of data.quotes) {
      await prisma.quote.create({
        data: {
          id: q.id,
          userId: q.userId || "",
          vehicleId: q.vehicleId || "",
          details: q.details ? JSON.stringify(q.details) : "{}",
          adminPrice: typeof q.adminPrice === "number" ? q.adminPrice : null,
          status: q.status || "pending",
          createdAt: q.createdAt || new Date().toISOString(),
        },
      });
    }
  }

  // 7. Migrate Partners
  if (data.partners && Array.isArray(data.partners)) {
    console.log(`Migrating ${data.partners.length} partners...`);
    for (const p of data.partners) {
      await prisma.partner.create({
        data: {
          id: p.id,
          userId: p.userId || "",
          companyName: p.companyName || "",
          commissionRate: typeof p.commissionRate === "number" ? p.commissionRate : 12,
          contractStart: p.contractStart || "",
          contractEnd: p.contractEnd || "",
          createdAt: p.createdAt || new Date().toISOString(),
        },
      });
    }
  }

  // 8. Migrate Invoices
  if (data.invoices && Array.isArray(data.invoices)) {
    console.log(`Migrating ${data.invoices.length} invoices...`);
    for (const inv of data.invoices) {
      await prisma.invoice.create({
        data: {
          id: inv.id,
          partnerId: inv.partnerId || null,
          corporateId: inv.corporateId || null,
          month: typeof inv.month === "number" ? inv.month : 1,
          year: typeof inv.year === "number" ? inv.year : 2026,
          totalAmount: typeof inv.totalAmount === "number" ? inv.totalAmount : 0,
          commissionAmount: typeof inv.commissionAmount === "number" ? inv.commissionAmount : 0,
          status: inv.status || "En attente de règlement",
          pdfUrl: inv.pdfUrl || "",
          currency: inv.currency || "FCFA",
          createdAt: inv.createdAt || new Date().toISOString(),
        },
      });
    }
  }

  // 9. Migrate Shifts
  if (data.shifts && Array.isArray(data.shifts)) {
    console.log(`Migrating ${data.shifts.length} shifts...`);
    for (const s of data.shifts) {
      await prisma.shift.create({
        data: {
          id: s.id,
          driverId: s.driverId || "",
          driverName: s.driverName || "",
          vehicleId: s.vehicleId || "",
          date: s.date || "",
          createdAt: s.createdAt || new Date().toISOString(),
          startConfirmed: s.startConfirmed !== undefined ? s.startConfirmed : null,
          startTime: s.startTime || null,
          startKm: typeof s.startKm === "number" ? s.startKm : null,
          startDepartureTime: s.startDepartureTime || null,
          startRechargeChecked: s.startRechargeChecked !== undefined ? s.startRechargeChecked : null,
          startInternetChecked: s.startInternetChecked !== undefined ? s.startInternetChecked : null,
          startPapersChecked: s.startPapersChecked !== undefined ? s.startPapersChecked : null,
          startDashPhoto: s.startDashPhoto || null,
          endConfirmed: s.endConfirmed !== undefined ? s.endConfirmed : null,
          endTime: s.endTime || null,
          endKm: typeof s.endKm === "number" ? s.endKm : null,
          endArrivalTime: s.endArrivalTime || null,
          endExteriorPhoto: s.endExteriorPhoto || null,
          endDashPhoto: s.endDashPhoto || null,
          endDailyReport: s.endDailyReport ? JSON.stringify(s.endDailyReport) : null,
          endRechargeProofPhoto: s.endRechargeProofPhoto || null,
          endPassationConfirmed: s.endPassationConfirmed !== undefined ? s.endPassationConfirmed : null,
        },
      });
    }
  }

  // 10. Migrate Trip Locations
  if (data.trip_locations && Array.isArray(data.trip_locations)) {
    console.log(`Migrating ${data.trip_locations.length} trip locations...`);
    for (const tl of data.trip_locations) {
      await prisma.tripLocation.create({
        data: {
          id: tl.id,
          reservationId: tl.reservationId || "",
          lat: typeof tl.lat === "number" ? tl.lat : 0,
          lng: typeof tl.lng === "number" ? tl.lng : 0,
          timestamp: tl.timestamp || new Date().toISOString(),
        },
      });
    }
  }

  console.log("Migration from db.json completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
