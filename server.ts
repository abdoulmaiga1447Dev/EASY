import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createServer as createViteServer } from "vite";
import { createServer as createHttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import PDFDocument from "pdfkit";
import nodemailer from "nodemailer";
import { createPartARouter } from "./server/partA/index";
import { runVehicleAlerts } from "./lib/alerts";
import { retryPendingNotifications } from "./lib/notifications";

// Configuration
const PORT = 3000;
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || "ev_premium_access_secret_123456";
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || "ev_premium_refresh_secret_78910";

// Helpers for reading/writing users DB
interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: "client" | "partenaire" | "chauffeur" | "admin" | "corporate";
  createdAt: string;
  partnerType?: string | null;
  status?: string | null;
  starRating?: string | null;
  documents?: any;
  rejectionReason?: string | null;
}

interface Driver {
  id: string;
  userId?: string;
  name: string;
  phone: string;
  email: string;
  photo?: string;
  availability?: "disponible" | "en_mission" | "indisponible";
  status: "disponible" | "en_mission" | "indisponible";
  rating?: number;
  vehicleId?: string;
  shift?: "matin" | "apres-midi";
  createdAt?: string;
}

interface ReservationOption {
  id: string;
  reservationId: string;
  optionName: string;
  price: number;
}

interface Reservation {
  id: string;
  userId: string;
  driverId: string | null;
  vehicleId: string;
  departureDate: string;
  departureTime: string;
  pickup: string;
  destination: string;
  formula: "hourly" | "halfday" | "fullday";
  totalPrice: number;
  status: "pending_assignment" | "confirmed" | "completed" | "cancelled" | "Payée" | "assigned" | "en_route" | "arrived" | "in_progress";
  segment: "public" | "premium";
  options: string[];
  createdAt: string;
  clientName?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  specialInstructions?: string | null;
  dispositionConfirmed?: boolean | null;
}

interface Quote {
  id: string;
  userId: string;
  vehicleId: string;
  details: {
    departureDate: string;
    departureTime: string;
    pickup: string;
    destination: string;
    durationHours: number;
    guests: number;
    specificNeeds: string;
  };
  adminPrice: number | null;
  status: "pending" | "sent" | "accepted" | "refused";
  createdAt: string;
}

interface Vehicle {
  id: string;
  category: "berline-premium" | "suv-executive" | "suv-prestige";
  brand: string;
  name: string;
  immatriculation: string;
  batteryLevel: number;
  status: "Disponible" | "Indisponible";
  photoFront?: string;
  photoBack?: string;
  photoLeft?: string;
  photoRight?: string;
  maxSpeed?: number;
  fuelConsumption?: string;
  totalDistance?: string;
}

interface Partner {
  id: string;
  userId: string;
  companyName: string;
  commissionRate: number; // e.g. 12
  contractStart: string;
  contractEnd: string;
  createdAt: string;
}

interface Invoice {
  id: string;
  partnerId?: string | null;  // null for corporate
  corporateId?: string | null; // null for partner
  month: number;
  year: number;
  totalAmount: number;
  commissionAmount: number; // 0 for corporate
  status: "En attente de règlement" | "Réglée";
  pdfUrl: string;
  currency?: "FCFA" | "EUR" | "USD";
  createdAt: string;
}

interface DBStructure {
  users: User[];
  drivers: Driver[];
  vehicles: Vehicle[];
  reservations: Reservation[];
  reservation_options: ReservationOption[];
  quotes: Quote[];
  trip_locations?: any[];
  partners: Partner[];
  invoices: Invoice[];
  shifts?: any[];
}

async function readDB(): Promise<DBStructure> {
  const [
    users,
    drivers,
    vehicles,
    reservations,
    reservation_options,
    quotes,
    partners,
    invoices,
    shifts,
    trip_locations
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.driver.findMany(),
    prisma.vehicle.findMany(),
    prisma.reservation.findMany(),
    prisma.reservationOption.findMany(),
    prisma.quote.findMany(),
    prisma.partner.findMany(),
    prisma.invoice.findMany(),
    prisma.shift.findMany(),
    prisma.tripLocation.findMany()
  ]);

  return {
    users: users.map(u => ({
      ...u,
      role: u.role as any,
      documents: u.documents ? JSON.parse(u.documents) : {}
    })),
    drivers: drivers as any[],
    vehicles: vehicles as any[],
    reservations: reservations.map(r => ({
      ...r,
      formula: r.formula as any,
      status: r.status as any,
      segment: r.segment as any,
      options: r.options ? JSON.parse(r.options) : []
    })),
    reservation_options: reservation_options as any[],
    quotes: quotes.map(q => ({
      ...q,
      status: q.status as any,
      details: q.details ? JSON.parse(q.details) : {}
    })),
    partners: partners as any[],
    invoices: invoices as any[],
    shifts: shifts.map(s => ({
      ...s,
      endDailyReport: s.endDailyReport ? JSON.parse(s.endDailyReport) : undefined
    })),
    trip_locations: trip_locations as any[]
  };
}

async function writeDB(data: DBStructure) {
  // 1. Users
  if (data.users) {
    const existingIds = (await prisma.user.findMany({ select: { id: true } })).map(x => x.id);
    const incomingIds = data.users.map(x => x.id);
    const toDelete = existingIds.filter(id => !incomingIds.includes(id));
    if (toDelete.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: toDelete } } });
    }
    for (const u of data.users) {
      const dbData = {
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
      };
      await prisma.user.upsert({
        where: { id: u.id },
        update: dbData,
        create: { id: u.id, ...dbData }
      });
    }
  }

  // 2. Drivers
  if (data.drivers) {
    const existingIds = (await prisma.driver.findMany({ select: { id: true } })).map(x => x.id);
    const incomingIds = data.drivers.map(x => x.id);
    const toDelete = existingIds.filter(id => !incomingIds.includes(id));
    if (toDelete.length > 0) {
      await prisma.driver.deleteMany({ where: { id: { in: toDelete } } });
    }
    for (const d of data.drivers) {
      const dbData = {
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
      };
      await prisma.driver.upsert({
        where: { id: d.id },
        update: dbData,
        create: { id: d.id, ...dbData }
      });
    }
  }

  // 3. Vehicles
  if (data.vehicles) {
    const existingIds = (await prisma.vehicle.findMany({ select: { id: true } })).map(x => x.id);
    const incomingIds = data.vehicles.map(x => x.id);
    const toDelete = existingIds.filter(id => !incomingIds.includes(id));
    if (toDelete.length > 0) {
      await prisma.vehicle.deleteMany({ where: { id: { in: toDelete } } });
    }
    for (const v of data.vehicles) {
      const dbData = {
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
      };
      await prisma.vehicle.upsert({
        where: { id: v.id },
        update: dbData,
        create: { id: v.id, ...dbData }
      });
    }
  }

  // 4. Reservations
  if (data.reservations) {
    const existingIds = (await prisma.reservation.findMany({ select: { id: true } })).map(x => x.id);
    const incomingIds = data.reservations.map(x => x.id);
    const toDelete = existingIds.filter(id => !incomingIds.includes(id));
    if (toDelete.length > 0) {
      await prisma.reservation.deleteMany({ where: { id: { in: toDelete } } });
    }
    for (const r of data.reservations) {
      const dbData = {
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
        clientName: r.clientName || null,
        clientPhone: r.clientPhone || null,
        clientEmail: r.clientEmail || null,
        specialInstructions: r.specialInstructions || null,
      };
      await prisma.reservation.upsert({
        where: { id: r.id },
        update: dbData,
        create: { id: r.id, ...dbData }
      });
    }
  }

  // 5. Reservation Options
  if (data.reservation_options) {
    const existingIds = (await prisma.reservationOption.findMany({ select: { id: true } })).map(x => x.id);
    const incomingIds = data.reservation_options.map(x => x.id);
    const toDelete = existingIds.filter(id => !incomingIds.includes(id));
    if (toDelete.length > 0) {
      await prisma.reservationOption.deleteMany({ where: { id: { in: toDelete } } });
    }
    for (const ro of data.reservation_options) {
      const dbData = {
        reservationId: ro.reservationId || "",
        optionName: ro.optionName || "",
        price: typeof ro.price === "number" ? ro.price : 0,
      };
      await prisma.reservationOption.upsert({
        where: { id: ro.id },
        update: dbData,
        create: { id: ro.id, ...dbData }
      });
    }
  }

  // 6. Quotes
  if (data.quotes) {
    const existingIds = (await prisma.quote.findMany({ select: { id: true } })).map(x => x.id);
    const incomingIds = data.quotes.map(x => x.id);
    const toDelete = existingIds.filter(id => !incomingIds.includes(id));
    if (toDelete.length > 0) {
      await prisma.quote.deleteMany({ where: { id: { in: toDelete } } });
    }
    for (const q of data.quotes) {
      const dbData = {
        userId: q.userId || "",
        vehicleId: q.vehicleId || "",
        details: q.details ? JSON.stringify(q.details) : "{}",
        adminPrice: typeof q.adminPrice === "number" ? q.adminPrice : null,
        status: q.status || "pending",
        createdAt: q.createdAt || new Date().toISOString(),
      };
      await prisma.quote.upsert({
        where: { id: q.id },
        update: dbData,
        create: { id: q.id, ...dbData }
      });
    }
  }

  // 7. Partners
  if (data.partners) {
    const existingIds = (await prisma.partner.findMany({ select: { id: true } })).map(x => x.id);
    const incomingIds = data.partners.map(x => x.id);
    const toDelete = existingIds.filter(id => !incomingIds.includes(id));
    if (toDelete.length > 0) {
      await prisma.partner.deleteMany({ where: { id: { in: toDelete } } });
    }
    for (const p of data.partners) {
      const dbData = {
        userId: p.userId || "",
        companyName: p.companyName || "",
        commissionRate: typeof p.commissionRate === "number" ? p.commissionRate : 12,
        contractStart: p.contractStart || "",
        contractEnd: p.contractEnd || "",
        createdAt: p.createdAt || new Date().toISOString(),
      };
      await prisma.partner.upsert({
        where: { id: p.id },
        update: dbData,
        create: { id: p.id, ...dbData }
      });
    }
  }

  // 8. Invoices
  if (data.invoices) {
    const existingIds = (await prisma.invoice.findMany({ select: { id: true } })).map(x => x.id);
    const incomingIds = data.invoices.map(x => x.id);
    const toDelete = existingIds.filter(id => !incomingIds.includes(id));
    if (toDelete.length > 0) {
      await prisma.invoice.deleteMany({ where: { id: { in: toDelete } } });
    }
    for (const inv of data.invoices) {
      const dbData = {
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
      };
      await prisma.invoice.upsert({
        where: { id: inv.id },
        update: dbData,
        create: { id: inv.id, ...dbData }
      });
    }
  }

  // 9. Shifts
  if (data.shifts) {
    const existingIds = (await prisma.shift.findMany({ select: { id: true } })).map(x => x.id);
    const incomingIds = data.shifts.map(x => x.id);
    const toDelete = existingIds.filter(id => !incomingIds.includes(id));
    if (toDelete.length > 0) {
      await prisma.shift.deleteMany({ where: { id: { in: toDelete } } });
    }
    for (const s of data.shifts) {
      const dbData = {
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
      };
      await prisma.shift.upsert({
        where: { id: s.id },
        update: dbData,
        create: { id: s.id, ...dbData }
      });
    }
  }

  // 10. Trip Locations
  if (data.trip_locations) {
    const existingIds = (await prisma.tripLocation.findMany({ select: { id: true } })).map(x => x.id);
    const incomingIds = data.trip_locations.map(x => x.id);
    const toDelete = existingIds.filter(id => !incomingIds.includes(id));
    if (toDelete.length > 0) {
      await prisma.tripLocation.deleteMany({ where: { id: { in: toDelete } } });
    }
    for (const tl of data.trip_locations) {
      const dbData = {
        reservationId: tl.reservationId || "",
        lat: typeof tl.lat === "number" ? tl.lat : 0,
        lng: typeof tl.lng === "number" ? tl.lng : 0,
        timestamp: tl.timestamp || new Date().toISOString(),
      };
      await prisma.tripLocation.upsert({
        where: { id: tl.id },
        update: dbData,
        create: { id: tl.id, ...dbData }
      });
    }
  }
}

// REAL NOTIFICATIONS HELPERS (Email & SMS)

function getAdminEmails(db: DBStructure): string[] {
  const adminUsers = (db.users || []).filter(u => u.role === "admin" && u.email);
  const emails = adminUsers.map(u => u.email.trim().toLowerCase());
  
  // Explicit support/admin email requested by user
  const supportEmail = "support@easybysaver.com";
  if (!emails.includes(supportEmail)) {
    emails.push(supportEmail);
  }

  const envAdmin = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  if (envAdmin && envAdmin.includes("@") && !emails.includes(envAdmin.trim().toLowerCase())) {
    emails.push(envAdmin.trim().toLowerCase());
  }
  return Array.from(new Set(emails));
}

// Email sending helper
async function sendRealEmail(toEmail: string, subject: string, textBody: string, htmlBody: string, bubbleError = false) {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const smtpHost = process.env.SMTP_HOST;

  console.log(`[Notification] Preparing email dispatch to: ${toEmail}`);

  // 1. Try Brevo API (extremely fast and modern REST endpoint)
  if (brevoApiKey && brevoApiKey !== "YOUR_API_KEY" && brevoApiKey.length > 5) {
    try {
      let fromAddress = process.env.SMTP_FROM || "no-reply@easybysaver.com";
      if (typeof fromAddress === "string") {
        fromAddress = fromAddress.trim();
        if (fromAddress.startsWith('"') && fromAddress.endsWith('"')) {
          fromAddress = fromAddress.slice(1, -1).trim();
        }
        if (fromAddress.startsWith("'") && fromAddress.endsWith("'")) {
          fromAddress = fromAddress.slice(1, -1).trim();
        }
        const match = fromAddress.match(/<([^>]+)>/);
        if (match && match[1]) {
          fromAddress = match[1]; // Brevo API expects just the email in sender
        }
      }

      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": brevoApiKey,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          sender: { name: "Easy by saver", email: fromAddress },
          to: [{ email: toEmail }],
          subject: subject,
          textContent: textBody,
          htmlContent: htmlBody
        })
      });

      if (response.ok) {
        console.log(`[Notification] Email successfully dispatched via Brevo to ${toEmail}`);
        return true;
      } else {
        const errText = await response.text();
        console.error(`[Notification] Brevo API email failed with status ${response.status}:`, errText);
        if (bubbleError) {
          throw new Error(`Brevo API failed (${response.status}): ${errText}`);
        }
      }
    } catch (err: any) {
      console.error("[Notification] Brevo API email connection error:", err);
      if (bubbleError) throw err;
    }
  }

  // 2. Try Standard SMTP (fallback or explicit choice)
  if (smtpHost && smtpHost.length > 3) {
    try {
      const smtpPortValue = process.env.SMTP_PORT || "587";
      const isPort465 = smtpPortValue.trim() === "465";

      const transporter = nodemailer.createTransport({
        host: smtpHost.trim(),
        port: parseInt(smtpPortValue),
        secure: isPort465,
        auth: {
          user: (process.env.SMTP_USER || "").trim(),
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false // Bypass SSL/TLS cert chain validation issues on standard VPS
        }
      });

      // Parse and clean up SMTP_FROM to avoid syntax issues on strict SMTP relays like Hostinger
      let fromAddress = process.env.SMTP_FROM || `"Easy by saver" <no-reply@easybysaver.com>`;
      if (typeof fromAddress === "string") {
        fromAddress = fromAddress.trim();
        
        // Strip outer enclosing quotes
        if (fromAddress.startsWith('"') && fromAddress.endsWith('"')) {
          fromAddress = fromAddress.slice(1, -1).trim();
        }
        if (fromAddress.startsWith("'") && fromAddress.endsWith("'")) {
          fromAddress = fromAddress.slice(1, -1).trim();
        }

        // Standardize format (e.g. 'Easy by saver' <support@easybysaver.com> -> "Easy by saver" <support@easybysaver.com>)
        const emailMatch = fromAddress.match(/^(.*)<(.*)>$/);
        if (emailMatch) {
          let displayName = emailMatch[1].trim();
          const emailPart = emailMatch[2].trim();
          
          if (displayName.startsWith("'") && displayName.endsWith("'")) {
            displayName = displayName.slice(1, -1).trim();
          }
          if (displayName.startsWith('"') && displayName.endsWith('"')) {
            displayName = displayName.slice(1, -1).trim();
          }
          
          if (displayName) {
            fromAddress = `"${displayName}" <${emailPart}>`;
          } else {
            fromAddress = emailPart;
          }
        }
      }

      await transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject: subject,
        text: textBody,
        html: htmlBody
      });

      console.log(`[Notification] Email successfully dispatched via SMTP to ${toEmail}`);
      return true;
    } catch (err: any) {
      console.error("[Notification] SMTP email failed:", err);
      if (bubbleError) throw err;
    }
  }

  if (bubbleError) {
    throw new Error("No mail credentials configured (checked BREVO_API_KEY and SMTP_HOST).");
  }

  console.warn(`[Notification] Email skipped: No valid mail credentials configured in secrets/environment.`);
  return false;
}

// SMS sending helper via Twilio
async function sendRealSMS(toPhone: string, message: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM;

  if (!accountSid || !authToken || !fromNumber || accountSid.length < 5) {
    console.warn("[Notification] SMS skipped: Twilio credentials not configured in environment.");
    return false;
  }

  try {
    // Format phone number to clean E.164 (without spaces, ensure leading +)
    let formattedPhone = toPhone.trim().replace(/\s+/g, "");
    if (!formattedPhone.startsWith("+") && !formattedPhone.startsWith("00")) {
      // Default to Côte d'Ivoire (+225) if country code is missing and matches local format
      if (formattedPhone.length === 10) {
        formattedPhone = "+225" + formattedPhone;
      } else {
        formattedPhone = "+" + formattedPhone;
      }
    } else if (formattedPhone.startsWith("00")) {
      formattedPhone = "+" + formattedPhone.substring(2);
    }

    console.log(`[Notification] Preparing SMS dispatch via Twilio to ${formattedPhone}`);

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const params = new URLSearchParams();
    params.append("To", formattedPhone);
    params.append("From", fromNumber);
    params.append("Body", message);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });

    if (response.ok) {
      console.log(`[Notification] SMS successfully dispatched via Twilio to ${formattedPhone}`);
      return true;
    } else {
      const errText = await response.text();
      console.error(`[Notification] Twilio API failed with status ${response.status}:`, errText);
    }
  } catch (err) {
    console.error("[Notification] Twilio SMS dispatch error:", err);
  }

  return false;
}

async function startServer() {
  // Auto-copy assets on start to handle images in /img
  try {
    const destBase = path.join(process.cwd(), "src", "assets", "images");
    const categories = ["all", "berline-premium", "suv-executive", "suv-prestige"];

    categories.forEach(cat => {
      const catDir = path.join(destBase, cat);
      if (!fs.existsSync(catDir)) {
        fs.mkdirSync(catDir, { recursive: true });
      }
    });

    const srcDir = path.join(process.cwd(), "img");
    if (fs.existsSync(srcDir)) {
      const images = fs.readdirSync(srcDir).filter(file => file.endsWith(".jpg") || file.endsWith(".png") || file.endsWith(".jpeg"));
      if (images.length > 0) {
        const distribution: { [key: string]: string[] } = {
          "all": [
            "pexels-cruz-in-portugal-36855175.jpg",
            "pexels-eddievaldes155-16288341.jpg",
            "pexels-giantasparagus-37576187.jpg",
            "pexels-holyson-h-2154634702-35336611.jpg"
          ],
          "berline-premium": [
            "pexels-maxavans-5058352.jpg",
            "pexels-talha-uguz-2156923509-34520604.jpg",
            "pexels-tviysempai-341982671-17534550.jpg"
          ],
          "suv-executive": [
            "pexels-vadutskevich-17000848.jpg",
            "pexels-zion-10029774.jpg",
            "pexels-cruz-in-portugal-36855175.jpg"
          ],
          "suv-prestige": [
            "pexels-eddievaldes155-16288341.jpg",
            "pexels-giantasparagus-37576187.jpg",
            "pexels-holyson-h-2154634702-35336611.jpg"
          ]
        };

        Object.keys(distribution).forEach(cat => {
          distribution[cat].forEach(imgName => {
            const srcPath = path.join(srcDir, imgName);
            const destPath = path.join(destBase, cat, imgName);
            if (fs.existsSync(srcPath)) {
              fs.writeFileSync(destPath, fs.readFileSync(srcPath));
            }
          });
        });
        console.log("[Backend] Successfully updated category images from /img");
      }
    }
  } catch (err) {
    console.error("[Backend] Error auto-copying assets:", err);
  }

  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // CORS middleware (basic allow for easier local integration)
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // Log requests
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // API HEALTH CHECK
  app.get("/api/health", async (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // EMAIL CONFIG DIAGNOSTIC TEST ENDPOINT
  app.get("/api/test-email", async (req, res) => {
    try {
      const to = (req.query.to as string) || "abdoulmaiga1447@gmail.com";
      console.log(`[Diagnostic] Sending test email to ${to}`);
      
      const config = {
        SMTP_HOST: process.env.SMTP_HOST || "not set",
        SMTP_PORT: process.env.SMTP_PORT || "not set",
        SMTP_USER: process.env.SMTP_USER || "not set",
        SMTP_FROM: process.env.SMTP_FROM || "not set",
        SMTP_PASS_EXISTS: !!process.env.SMTP_PASS,
        SMTP_PASS_LENGTH: process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 0,
        BREVO_API_KEY_EXISTS: !!process.env.BREVO_API_KEY,
        BREVO_API_KEY_LENGTH: process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.length : 0,
      };

      const subject = "Test de configuration e-mail Easy by saver";
      const textBody = "Félicitations! Le moteur d'envoi d'e-mails de votre plateforme Easy by saver est correctement configuré et fonctionne à merveille.";
      const htmlBody = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0c0c12; color: #ffffff; border-radius: 12px; border: 1px solid #1f1f2e;">
          <div style="text-align: center; padding-bottom: 25px; border-bottom: 1px solid #1f1f2e; margin-bottom: 25px;">
            <!-- LOGO DESIGN WITH NAME "EASY" WELL VISIBLE -->
            <div style="display: inline-block; background-color: #C5A880; color: #000000; font-family: 'Arial Black', -apple-system, sans-serif; font-weight: 900; font-size: 26px; padding: 12px 30px; border-radius: 6px; letter-spacing: 5px; line-height: 1; margin-bottom: 15px; border: 2px solid #E5C8A0; box-shadow: 0 4px 20px rgba(197, 168, 128, 0.25);">EASY</div>
            <!-- REPLACED BRANDING TEXT -->
            <h1 style="color: #ffffff; font-size: 22px; font-weight: bold; margin: 0; text-transform: uppercase; letter-spacing: 2px;">EASY BY SAVER</h1>
            <p style="color: #a3a3c2; font-size: 13px; margin: 6px 0 0 0; font-family: Georgia, serif; font-style: italic;">Electric Automobile to Save You</p>
          </div>

          <div style="padding: 10px 0;">
            <p style="font-size: 16px; color: #e1e1e6; line-height: 1.6;">
              Félicitations ! Le moteur d'envoi d'e-mails de votre plateforme <strong>Easy by saver</strong> est correctement configuré et fonctionne à merveille.
            </p>
            <div style="background-color: #12121a; padding: 15px; border-left: 4px solid #C5A880; margin: 20px 0; border-radius: 4px;">
              <strong style="color: #C5A880; font-size: 14px;">Détails du diagnostic :</strong><br/>
              <ul style="font-size: 13px; color: #a3a3c2; padding-left: 20px; margin: 8px 0 0 0; line-height: 1.6;">
                <li><strong>Serveur SMTP :</strong> ${config.SMTP_HOST}</li>
                <li><strong>Port :</strong> ${config.SMTP_PORT}</li>
                <li><strong>Utilisateur :</strong> ${config.SMTP_USER}</li>
                <li><strong>Expéditeur :</strong> ${config.SMTP_FROM}</li>
              </ul>
            </div>
          </div>

          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #1f1f2e; font-size: 11px; color: #5c5c7a; margin-top: 25px;">
            <p>Cet e-mail de test a été généré suite à une demande de diagnostic.</p>
            <p>&copy; ${new Date().getFullYear()} Easy by saver. Tous droits réservés.</p>
          </div>
        </div>
      `;

      await sendRealEmail(to, subject, textBody, htmlBody, true);

      return res.json({
        status: "success",
        message: `Email de test envoyé avec succès à ${to}. Veuillez vérifier votre boîte de réception et vos spams.`,
        config_diagnostic: config
      });
    } catch (err: any) {
      console.error("[Diagnostic] Test email failed:", err);
      return res.status(500).json({
        status: "error",
        message: "L'envoi de l'e-mail a échoué. Voir les détails ci-dessous pour corriger votre configuration.",
        error_message: err.message || err,
        error_stack: err.stack,
        error_code: err.code,
        error_command: err.command,
        error_response: err.response,
        config_diagnostic: {
          SMTP_HOST: process.env.SMTP_HOST || "not set",
          SMTP_PORT: process.env.SMTP_PORT || "not set",
          SMTP_USER: process.env.SMTP_USER || "not set",
          SMTP_FROM: process.env.SMTP_FROM || "not set",
          SMTP_PASS_EXISTS: !!process.env.SMTP_PASS,
          BREVO_API_KEY_EXISTS: !!process.env.BREVO_API_KEY,
        }
      });
    }
  });

  // GET PUBLIC VEHICLES LIST (ONLY "Disponible")
  app.get("/api/vehicles", async (req, res) => {
    try {
      const db = await readDB();
      const availableVehicles = db.vehicles.filter((v) => v.status === "Disponible");
      return res.json({ vehicles: availableVehicles });
    } catch (err: any) {
      console.error("Get vehicles error:", err);
      return res.status(500).json({ error: "Erreur serveur lors de la récupération des véhicules" });
    }
  });

  // GET AUTOCOMPLETE PLACES FROM GOOGLE MAPS WITH ROBUST FALLBACKS
  app.get("/api/autocomplete", async (req, res) => {
    try {
      const { input } = req.query;
      if (!input || typeof input !== "string" || !input.trim()) {
        return res.json({ predictions: [] });
      }

      const queryStr = input.trim();

      // 1. TRY GOOGLE MAPS FIRST IF KEY IS CONFIGURED
      const apiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY;
      if (apiKey && apiKey !== "YOUR_API_KEY" && apiKey.length > 5) {
        try {
          const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(queryStr)}&key=${apiKey}&components=country:ci&language=fr`;
          const response = await fetch(url);
          const data = await response.json() as any;

          if (data && data.status === "OK" && Array.isArray(data.predictions) && data.predictions.length > 0) {
            const results = data.predictions.map((p: any) => ({
              name: p.description,
              place_id: p.place_id
            }));
            return res.json({ predictions: results });
          } else {
            console.warn("Google Maps Autocomplete status/empty:", data?.status, data?.error_message);
          }
        } catch (gErr) {
          console.error("Google Maps Autocomplete failed, trying OpenStreetMap Nominatim fallback:", gErr);
        }
      }

      // 2. TRY PHOTON API (extremely fast, open, and geocoded)
      try {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(queryStr)}&limit=10&lang=fr`;
        const response = await fetch(url);
        const data = await response.json() as any;

        if (data && Array.isArray(data.features) && data.features.length > 0) {
          const results = data.features
            .map((f: any) => {
              const p = f.properties;
              const nameParts = [];
              if (p.name) nameParts.push(p.name);
              if (p.street) nameParts.push(p.street);
              if (p.district) nameParts.push(p.district);
              if (p.city && p.city !== p.name) nameParts.push(p.city);
              
              if (p.country && p.country !== "Côte d'Ivoire" && p.country !== "Ivory Coast") {
                nameParts.push(p.country);
              } else {
                nameParts.push("Côte d'Ivoire");
              }
              
              const fullName = nameParts.filter((val, idx, arr) => arr.indexOf(val) === idx).join(", ");
              return {
                name: fullName,
                place_id: "photon_" + (p.osm_id || Math.random())
              };
            })
            .filter((item: any) => 
              item.name.toLowerCase().includes("côte d'ivoire") || 
              item.name.toLowerCase().includes("ivory coast") ||
              item.name.toLowerCase().includes("abidjan") ||
              item.name.toLowerCase().includes("yamoussoukro") ||
              item.name.toLowerCase().includes("bassam")
            );

          if (results.length > 0) {
            return res.json({ predictions: results });
          }
        }
      } catch (photonErr) {
        console.error("Photon API failed, trying Nominatim fallback:", photonErr);
      }

      // 3. FALLBACK TO OPENSTREETMAP NOMINATIM FOR HIGH QUALITY DYNAMIC SEARCH (NO KEY REQUIRED)
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(queryStr)}&format=json&addressdetails=1&limit=8&countrycodes=ci&accept-language=fr`;
        const response = await fetch(url, {
          headers: {
            "User-Agent": "EasyBySaverApp/1.0 (abdoulmaiga1447@gmail.com)"
          }
        });
        const data = await response.json() as any[];

        if (Array.isArray(data) && data.length > 0) {
          const results = data.map((item: any) => ({
            name: item.display_name,
            place_id: String(item.place_id)
          }));
          return res.json({ predictions: results });
        }
      } catch (osmErr) {
        console.error("OpenStreetMap Nominatim search fallback failed:", osmErr);
      }

      // 4. HARDCODED LOCAL FALLBACK FOR OFFLINE / CRITICAL BACKUP
      const ABIDJAN_FALLBACKS = [
        // Adjamé
        { name: "Adjamé Liberté, Abidjan" },
        { name: "Adjamé Forum des Marchés, Abidjan" },
        { name: "Adjamé 220 Logements, Abidjan" },
        { name: "Mairie d'Adjamé, Abidjan" },
        { name: "Gare Routière d'Adjamé, Abidjan" },
        { name: "Adjamé Mirador, Abidjan" },
        { name: "Adjamé Paillet, Abidjan" },

        // Cocody
        { name: "Cocody Centre, Abidjan" },
        { name: "Cocody Deux Plateaux, Abidjan" },
        { name: "Cocody Deux Plateaux Vallon, Abidjan" },
        { name: "Cocody Angré (Nouveau CHU), Abidjan" },
        { name: "Cocody Angré Djibi, Abidjan" },
        { name: "Cocody Angré Nouveau Horizon, Abidjan" },
        { name: "Cocody Riviera 1, Abidjan" },
        { name: "Cocody Riviera 2, Abidjan" },
        { name: "Cocody Riviera 3 (Lycée Américain), Abidjan" },
        { name: "Cocody Riviera 4 (M'Pouto), Abidjan" },
        { name: "Cocody Riviera Palmeraie, Abidjan" },
        { name: "Cocody Riviera Bonoumin, Abidjan" },
        { name: "Cocody Riviera Golf, Abidjan" },
        { name: "Cocody Riviera Faya, Abidjan" },
        { name: "Cocody Saint-Jean, Abidjan" },
        { name: "Université Félix Houphouët-Boigny, Cocody" },
        { name: "CHU de Cocody, Abidjan" },

        // Plateau
        { name: "Plateau, Abidjan (Quartier des Affaires)" },
        { name: "Boulevard de la République, Plateau, Abidjan" },
        { name: "Avenue Chardy, Plateau, Abidjan" },
        { name: "Cathédrale Saint-Paul, Plateau, Abidjan" },
        { name: "Hôtel Tiama, Plateau, Abidjan" },
        { name: "Hôtel Pullman, Plateau, Abidjan" },
        { name: "Hôtel Noom, Plateau, Abidjan" },
        { name: "Stade Félix Houphouët-Boigny (Félicia), Plateau" },
        { name: "Mairie du Plateau, Abidjan" },

        // Marcory
        { name: "Marcory Zone 4 (Rue Pierre & Marie Curie), Abidjan" },
        { name: "Marcory Zone 4 (Rue Paul Langevin), Abidjan" },
        { name: "Marcory Zone 4 (Rue du Canal), Abidjan" },
        { name: "Marcory Résidentiel, Abidjan" },
        { name: "Marcory Centre, Abidjan" },
        { name: "Boulevard de Marseille, Marcory, Abidjan" },
        { name: "Biétry, Marcory, Abidjan" },

        // Treichville
        { name: "Treichville, Boulevard de Marseille, Abidjan" },
        { name: "CHU de Treichville, Abidjan" },
        { name: "Palais des Sports de Treichville, Abidjan" },
        { name: "Port Autonome d'Abidjan, Treichville" },

        // Koumassi
        { name: "Koumassi Centre, Abidjan" },
        { name: "Koumassi Zone Industrielle, Abidjan" },
        { name: "Koumassi Soweto, Abidjan" },
        { name: "Koumassi Remblais, Abidjan" },

        // Port-Bouët
        { name: "Aéroport International Félix Houphouët-Boigny, Port-Bouët" },
        { name: "Port-Bouët Centre, Abidjan" },
        { name: "Port-Bouët Vridi (Zone Industrielle), Abidjan" },

        // Yopougon
        { name: "Yopougon Siporex, Abidjan" },
        { name: "Yopougon Maroc, Abidjan" },
        { name: "Yopougon Niangon, Abidjan" },
        { name: "Yopougon Toits Rouges, Abidjan" },
        { name: "Yopougon Sogefiha, Abidjan" },

        // Abobo
        { name: "Abobo Gare, Abidjan" },
        { name: "Abobo Baoulé, Abidjan" },
        { name: "Abobo Samaké, Abidjan" },
        { name: "Abobo Dokui, Abidjan" },

        // Bingerville
        { name: "Bingerville Centre, Abidjan" },
        { name: "Bingerville Fehi Kessé, Abidjan" },

        // Out of city / Resorts
        { name: "Grand-Bassam, Zone Balnéaire" },
        { name: "Grand-Bassam Quartier France" },
        { name: "Assinie-Mafia, Club Méditerranée" }
      ];

      const filtered = ABIDJAN_FALLBACKS.filter(loc =>
        loc.name.toLowerCase().includes(queryStr.toLowerCase())
      ).map(loc => ({
        name: loc.name,
        place_id: "local_" + loc.name.replace(/\s+/g, "_")
      }));

      return res.json({ predictions: filtered });
    } catch (err: any) {
      console.error("Autocomplete API master error:", err);
      return res.json({ predictions: [] });
    }
  });

  // ==========================================
  // AUTHENTICATION ENDPOINTS
  // ==========================================

  // REGISTER
  app.post(["/auth/register", "/api/auth/register"], async (req, res) => {
    try {
      const { name, email, phone, password, role } = req.body;
      const isClient = (!role || role === "client");

      if (!name || !email || (!isClient && !phone) || !password) {
        return res.status(400).json({ error: { fr: "Tous les champs sont requis", en: "All fields are required" } });
      }

      // Check email uniqueness
      const db = await readDB();
      const existingUser = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ error: { fr: "Cet email est déjà enregistré", en: "This email is already registered" } });
      }

      // Determine correct role (default to client if invalid or not specified)
      // Accept client, partenaire or corporate from account type selection
      let userRole: "client" | "partenaire" | "chauffeur" | "admin" | "corporate" = "client";
      if (role === "partenaire" || role === "chauffeur" || role === "admin" || role === "corporate") {
        userRole = role;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const newUser: User = {
        id: "usr_" + Math.random().toString(36).substr(2, 9),
        name,
        email: email.toLowerCase(),
        phone: phone || "",
        passwordHash,
        role: userRole,
        createdAt: new Date().toISOString()
      };

      const isHospitality = userRole === "partenaire" && req.body.partnerType === "hospitality";
      const isCorporate = userRole === "corporate";

      if (isHospitality) {
        (newUser as any).partnerType = "hospitality";
        (newUser as any).status = "pending_validation";
        (newUser as any).starRating = req.body.starRating || "all";
        (newUser as any).documents = req.body.documents || {};
      } else if (isCorporate) {
        (newUser as any).status = "pending_validation";
        (newUser as any).companyName = req.body.companyName || name;
        (newUser as any).documents = req.body.documents || {};
      }

      db.users.push(newUser);
      await writeDB(db);

      if (isHospitality || isCorporate) {
        const typeLabel = isHospitality ? "votre établissement hôtelier/résidence" : "votre entreprise";
        const docListHtml = isHospitality 
          ? `
                <li>RCCM (Registre du Commerce et du Crédit Mobilier)</li>
                <li>Licence d'exploitation du Ministère du Tourisme</li>
                <li>Déclaration Fiscale d'Existence (DFE)</li>
                <li>CNI ou passeport du dirigeant</li>
                ${req.body.starRating ? `<li>Certificat de classement étoiles (facultatif) : ${req.body.starRating} étoiles</li>` : ""}
            `
          : `
                <li>RCCM (Registre du Commerce et du Crédit Mobilier)</li>
                <li>Déclaration Fiscale d'Existence (DFE)</li>
                <li>CNI ou passeport du dirigeant</li>
            `;

        const emailSubject = "Votre compte est en cours de validation — EASY by Saver";
        const emailText = `Bonjour ${name},\n\nVotre demande d'inscription pour ${typeLabel} a bien été reçue. Nos équipes examinent actuellement vos documents.\n\nVotre compte est en cours de validation. Vous n'avez pas encore d'accès à la plateforme à ce stade. Nous vous recontacterons très rapidement dès validation de votre dossier.\n\nL'équipe EASY`;
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #C5A880; border-radius: 8px; background-color: #0E0E14; color: #E0E0E0;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #C5A880; font-size: 24px; margin: 0;">EASY (by Saver)</h1>
              <p style="color: #8A8A9A; font-size: 12px; margin: 5px 0 0 0;">Prestige Mobile Service</p>
            </div>
            <div style="padding: 20px; background-color: #14141C; border-radius: 6px; border: 1px solid #C5A880/20;">
              <h2 style="color: #ffffff; font-size: 18px; border-bottom: 1px solid #C5A880/20; padding-bottom: 10px; margin-top: 0;">Votre compte est en cours de validation</h2>
              <p style="font-size: 14px; line-height: 1.6;">Bonjour <strong>${name}</strong>,</p>
              <p style="font-size: 14px; line-height: 1.6;">Nous vous remercions de votre intérêt pour EASY. Votre demande d'inscription pour <strong>${typeLabel}</strong> a bien été enregistrée.</p>
              <p style="font-size: 14px; line-height: 1.6; color: #C5A880; font-weight: bold;">Statut actuel de votre dossier : En cours d'examen</p>
              <p style="font-size: 14px; line-height: 1.6;">Nos équipes étudient actuellement votre demande d'inscription et les informations transmises :</p>
              <ul style="font-size: 13px; line-height: 1.6; color: #8A8A9A;">
                ${docListHtml}
              </ul>
              <div style="background-color: #201E1B; border-left: 4px solid #C5A880; padding: 12px; margin: 20px 0; border-radius: 0 4px 4px 0;">
                <p style="margin: 0; font-size: 13px; color: #C5A880; font-weight: bold;">Note importante :</p>
                <p style="margin: 5px 0 0 0; font-size: 13px; line-height: 1.4; color: #E0E0E0;">Votre compte est actuellement en cours de traitement. Vous recevrez la confirmation d'accès dès que l'administrateur EASY aura validé votre dossier.</p>
              </div>
              <p style="font-size: 14px; line-height: 1.6;">Dès que l'examen de votre dossier sera finalisé, vous recevrez un email de confirmation contenant un lien pour accéder directement à votre espace.</p>
            </div>
            <div style="text-align: center; margin-top: 20px; font-size: 11px; color: #8A8A9A;">
              <p>Cet email a été envoyé automatiquement par le service d'administration EASY.</p>
              <p>© 2026 EASY Luxury Transportation. Tous droits réservés.</p>
            </div>
          </div>
        `;
        sendRealEmail(email.toLowerCase(), emailSubject, emailText, emailHtml).catch(err => console.error("Simulated email send error", err));

        return res.status(201).json({
          message: {
            fr: "Votre demande d'inscription a été enregistrée. Votre compte est en cours de validation par l'administrateur EASY. Un email automatique vous a été envoyé.",
            en: "Your registration request has been saved. Your account is being validated by the EASY administrator. An automatic email has been sent to you."
          },
          status: "pending_validation",
          user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            phone: newUser.phone,
            role: newUser.role,
            partnerType: isHospitality ? "hospitality" : null,
            companyName: isCorporate ? (newUser as any).companyName : null,
            status: "pending_validation",
            createdAt: newUser.createdAt
          }
        });
      }

      // Issue tokens
      const accessToken = jwt.sign(
        { userId: newUser.id, email: newUser.email, role: newUser.role },
        ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" }
      );

      const refreshToken = jwt.sign(
        { userId: newUser.id },
        REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
      );

      return res.status(201).json({
        message: { fr: "Compte créé avec succès", en: "Account created successfully" },
        accessToken,
        refreshToken,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
          createdAt: newUser.createdAt
        }
      });
    } catch (err: any) {
      console.error("Register error:", err);
      return res.status(500).json({ error: { fr: "Erreur serveur lors de l'enregistrement", en: "Server error during registration" } });
    }
  });

  // LOGIN
  app.post(["/auth/login", "/api/auth/login"], async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: { fr: "Email et mot de passe requis", en: "Email and password are required" } });
      }

      const cleanEmail = email.trim().toLowerCase();
      const db = await readDB();
      const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (!user) {
        console.warn(`[Login] User not found for email: ${cleanEmail}`);
        return res.status(401).json({ error: { fr: "Identifiants incorrects (Compte non trouvé)", en: "Invalid credentials (Account not found)" } });
      }

      // Check if user is blocked
      if ((user as any).isBlocked) {
        return res.status(403).json({ error: { fr: "Ce compte a été bloqué par l'administrateur.", en: "This account has been blocked by the administrator." } });
      }

      // Check password (with fallback for default password "password" on seeded users)
      const isDefaultPreseededHash = user.passwordHash === "$2b$10$Aqz14Mqu8ZWEK1kc5cyPxukE/p6Gi3bfQEgjPLN9lOS1vKW/0lq3a";
      const isPasswordValid = (password === "password" && isDefaultPreseededHash) || await bcrypt.compare(password, user.passwordHash);
      
      if (!isPasswordValid) {
        console.warn(`[Login] Incorrect password for email: ${cleanEmail}`);
        return res.status(401).json({ error: { fr: "Identifiants incorrects (Mot de passe erroné)", en: "Invalid credentials (Wrong password)" } });
      }

      // Check Partner Hospitality or Corporate validation status
      const usrAny = user as any;
      if (user.role === "partenaire" || user.role === "corporate") {
        if (usrAny.status === "pending_validation") {
          return res.status(403).json({
            error: {
              fr: "Votre compte est en cours d'analyse",
              en: "Your account is under analysis"
            },
            status: "pending_validation"
          });
        }
        if (usrAny.status === "rejected") {
          return res.status(403).json({
            error: {
              fr: `Votre demande d'inscription a été rejetée. Motif : ${usrAny.rejectionReason || 'Non spécifié'}`,
              en: `Your registration request was rejected. Reason: ${usrAny.rejectionReason || 'Unspecified'}`
            },
            status: "rejected",
            rejectionReason: usrAny.rejectionReason
          });
        }
      }

      console.log(`[Login] Success for ${cleanEmail} (Role: ${user.role})`);

      // Issue tokens
      const accessToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" }
      );

      const refreshToken = jwt.sign(
        { userId: user.id },
        REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({
        message: { fr: "Connexion réussie", en: "Login successful" },
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          partnerType: usrAny.partnerType || null,
          status: usrAny.status || null,
          starRating: usrAny.starRating || null,
          createdAt: user.createdAt
        }
      });
    } catch (err: any) {
      console.error("Login error:", err);
      return res.status(500).json({ error: { fr: "Erreur serveur lors de l'authentification", en: "Server error during login" } });
    }
  });

  // REFRESH TOKEN
  app.post(["/auth/refresh", "/api/auth/refresh"], async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: { fr: "Token de rafraîchissement requis", en: "Refresh token is required" } });
      }

      // Verify refresh token
      let decoded: any;
      try {
        decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
      } catch (err) {
        return res.status(403).json({ error: { fr: "Token expiré ou invalide", en: "Expired or invalid refresh token" } });
      }

      const db = await readDB();
      const user = db.users.find((u) => u.id === decoded.userId);
      if (!user) {
        return res.status(403).json({ error: { fr: "Utilisateur introuvable", en: "User not found" } });
      }

      // Issue new access token
      const accessToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" }
      );

      return res.json({
        accessToken
      });
    } catch (err: any) {
      console.error("Refresh token error:", err);
      return res.status(500).json({ error: { fr: "Erreur serveur", en: "Server error" } });
    }
  });

  // GET MAIN USER (GET /api/me)
  app.get("/api/me", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: { fr: "Non autorisé", en: "Unauthorized" } });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as any;

      const db = await readDB();
      const user = db.users.find((u) => u.id === decoded.userId);
      if (!user) {
        return res.status(401).json({ error: { fr: "Utilisateur non trouvé", en: "User not found" } });
      }

      const usrAny = user as any;
      return res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          partnerType: usrAny.partnerType || null,
          status: usrAny.status || null,
          starRating: usrAny.starRating || null,
          createdAt: user.createdAt
        }
      });
    } catch (err) {
      return res.status(401).json({ error: { fr: "Token invalide ou expiré", en: "Invalid or expired token" } });
    }
  });

  // ==========================================
  // SPRINT 2 — RESERVATION & CALCUL LOGIC
  // ==========================================

  // Authentication Helper Middleware for local routes
  const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: { fr: "Authentification requise", en: "Authentication required" } });
      }
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as any;
      const db = await readDB();
      const user = db.users.find((u) => u.id === decoded.userId);
      if (!user) {
        return res.status(401).json({ error: { fr: "Utilisateur non trouvé", en: "User not found" } });
      }
      (req as any).user = user;
      next();
    } catch (err) {
      return res.status(401).json({ error: { fr: "Session expirée ou invalide", en: "Invalid or expired session" } });
    }
  };

  // 1. Core Price Calculation Service (Task 2)
  function calculatePrice(details: {
    vehicleClass: "N1" | "N2" | "N3";
    formula: "hourly" | "halfday" | "fullday";
    durationHours: number;
    departureDate: string;
    departureTime: string;
    options: {
      bilingual: boolean;
      airportGreeting: boolean;
    };
  }) {
    const { vehicleClass, formula, durationHours, departureDate, departureTime, options } = details;

    if (vehicleClass === "N3") {
      return { totalPrice: null, isQuote: true };
    }

    // Determine base rate
    let baseRate = 0;
    if (vehicleClass === "N1") {
      if (formula === "hourly") {
        if (durationHours === 1) {
          baseRate = 10000;
        } else if (durationHours === 2) {
          baseRate = 18000;
        } else if (durationHours === 3) {
          baseRate = 21000;
        } else {
          baseRate = 10000 * Math.max(1, durationHours || 1);
        }
      } else if (formula === "halfday") {
        baseRate = 45000; // 8h
      } else {
        baseRate = 85000; // 16h
      }
    } else if (vehicleClass === "N2") {
      if (formula === "hourly") {
        if (durationHours === 1) {
          baseRate = 15000;
        } else if (durationHours === 2) {
          baseRate = 28000;
        } else if (durationHours === 3) {
          baseRate = 39000;
        } else {
          baseRate = 15000 * Math.max(1, durationHours || 1);
        }
      } else if (formula === "halfday") {
        baseRate = 60000; // 8h
      } else {
        baseRate = 110000; // 16h
      }
    }

    let multiplier = 1.0;

    // A. Detect Night Shift (22h - 6h) (+20%)
    if (departureTime) {
      const [hourStr] = departureTime.split(":");
      const hours = parseInt(hourStr, 10);
      if (!isNaN(hours)) {
        if (hours >= 22 || hours < 6) {
          multiplier += 0.20;
        }
      }
    }

    // B. Detect Weekend (+20%)
    if (departureDate) {
      const dateObj = new Date(departureDate);
      const dayOfWeek = dateObj.getDay(); // 0 is Sunday, 6 is Saturday
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        multiplier += 0.20;
      }
    }

    // C. Bilingual Chauffeur Option (+15%)
    if (options.bilingual) {
      multiplier += 0.15;
    }

    // Apply cumulative multipliers
    let total = baseRate * multiplier;

    // D. Airport Greeting (+5000 FCFA flat)
    if (options.airportGreeting) {
      total += 5000;
    }

    // Round UP to the nearest 500 FCFA
    const roundedPrice = Math.ceil(total / 500) * 500;

    return {
      basePrice: baseRate,
      multiplier,
      isNight: departureTime ? (parseInt(departureTime.split(":")[0], 10) >= 22 || parseInt(departureTime.split(":")[0], 10) < 6) : false,
      isWeekend: departureDate ? (new Date(departureDate).getDay() === 0 || new Date(departureDate).getDay() === 6) : false,
      totalPrice: roundedPrice,
      isQuote: false
    };
  }

  // Endpoints for calculation
  app.post("/api/reservations/calculate", async (req, res) => {
    try {
      const { vehicleClass, formula, durationHours, departureDate, departureTime, options } = req.body;
      if (!vehicleClass || !formula) {
        return res.status(400).json({ error: "Missing parameters" });
      }
      const pricing = calculatePrice({
        vehicleClass,
        formula,
        durationHours: durationHours || 1,
        departureDate,
        departureTime,
        options: options || { bilingual: false, airportGreeting: false }
      });
      return res.json(pricing);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // GET Drivers list (Admins only)
  app.get("/api/drivers", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Access denied. Admin only." });
      }
      const db = await readDB();
      return res.json({ drivers: db.drivers });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // Create real-time reservation (Task 1 and Task 4 Driver Matching)
  app.post("/api/reservations", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const {
        vehicleId, // "N1" or "N2"
        departureDate,
        departureTime,
        pickup,
        destination,
        formula,
        durationHours,
        options, // Array of strings e.g. ["bilingual", "airportGreeting"]
        totalPrice,
        segment, // "public" or "premium"
        status, // "Payée" or other custom status
        phone
      } = req.body;

      if (!vehicleId || !departureDate || !departureTime || !destination || !formula) {
        return res.status(400).json({ error: { fr: "Paramètres manquants", en: "Missing booking inputs" } });
      }

      const db = await readDB();

      // Driver assignment logic (Manual assignment only, as requested by the user)
      const finalDriverId = null;
      const finalStatus = "pending_assignment";

      const reservationId = "res_" + Math.random().toString(36).substr(2, 9);
      const newReservation: Reservation = {
        id: reservationId,
        userId: user.id,
        driverId: finalDriverId,
        vehicleId,
        departureDate,
        departureTime,
        pickup: pickup || "Non renseigné",
        destination,
        formula,
        totalPrice,
        status: finalStatus,
        segment: segment || "public",
        options: options || [],
        createdAt: new Date().toISOString(),
        clientName: user.name || null,
        clientPhone: phone || user.phone || null,
        clientEmail: user.email || null
      };

      db.reservations.push(newReservation);

      // Save option pricing details if any
      if (options && options.length > 0) {
        options.forEach((opt: string) => {
          let optPrice = 0;
          if (opt === "airportGreeting") optPrice = 5000;
          else {
            // Option was bilingual or night/weekend calculated in the pricing breakdown
            optPrice = Math.round(totalPrice * 0.15); // estimation simple relative
          }
          db.reservation_options.push({
            id: "opt_" + Math.random().toString(36).substr(2, 9),
            reservationId,
            optionName: opt,
            price: optPrice
          });
        });
      }

      await writeDB(db);

      // REAL NOTIFICATIONS DISPATCH (Email & SMS)
      try {
        const vehicleName = vehicleId === "N1" ? "Berline Premium (N1)" : vehicleId === "N2" ? "Berline Prestige (N2)" : "Berline Executive (N3)";
        const formulaLabel = formula === "hourly" ? "À l'heure" : formula === "halfday" ? "Demi-journée" : "Journée complète";
        
        const protocol = req.secure ? "https" : "http";
        const host = req.get("host");
        const bookingsLink = `${protocol}://${host}/#commandes`;

        if (user.email) {
          const emailSubject = `Confirmation d'enregistrement de votre réservation - Easy by saver`;
          
          const emailText = `Bonjour ${user.name},\n\n` +
            `Nous vous remercions pour votre confiance.\n\n` +
            `Votre demande de réservation #${reservationId} a été bien enregistrée dans notre système.\n` +
            `Notre service client procède actuellement à sa validation dans un court délai.\n\n` +
            `DÉTAILS DE LA COMMANDE :\n` +
            `- Véhicule : ${vehicleName}\n` +
            `- Date de départ : ${departureDate} à ${departureTime}\n` +
            `- Lieu de prise en charge : ${pickup}\n` +
            `- Destination : ${destination}\n` +
            `- Formule : ${formulaLabel}\n` +
            `- Montant estimé : ${totalPrice.toLocaleString('fr-FR')} FCFA\n\n` +
            `Vous pouvez suivre, modifier ou annuler vos réservations à tout moment en cliquant sur ce lien : ${bookingsLink}\n\n` +
            `Vous recevrez un e-mail de validation de votre commande d'ici peu de temps.\n\n` +
            `Cordialement,\n` +
            `L'équipe Easy by saver\n` +
            `https://easybysaver.com`;

          const emailHtml = `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0c0c12; color: #ffffff; border-radius: 12px; border: 1px solid #1f1f2e;">
              <div style="text-align: center; padding-bottom: 25px; border-bottom: 1px solid #1f1f2e; margin-bottom: 25px;">
                <!-- BEAUTIFUL DESIGN LOGO -->
                <div style="display: inline-block; background-color: #C5A880; color: #000000; font-family: 'Arial Black', -apple-system, sans-serif; font-weight: 900; font-size: 26px; padding: 12px 30px; border-radius: 6px; letter-spacing: 5px; line-height: 1; margin-bottom: 15px; border: 2px solid #E5C8A0; box-shadow: 0 4px 20px rgba(197, 168, 128, 0.25);">EASY</div>
                <!-- REPLACED BRANDING TEXT -->
                <h1 style="color: #ffffff; font-size: 22px; font-weight: bold; margin: 0; text-transform: uppercase; letter-spacing: 2px;">EASY BY SAVER</h1>
                <p style="color: #a3a3c2; font-size: 13px; margin: 6px 0 0 0; font-family: Georgia, serif; font-style: italic;">Electric Automobile to Save You</p>
              </div>
              
              <div style="padding: 20px 0;">
                <p style="font-size: 16px; line-height: 1.5; color: #e1e1e6;">Bonjour <strong>${user.name}</strong>,</p>
                <p style="font-size: 15px; line-height: 1.5; color: #a3a3c2;">Nous vous remercions pour votre confiance. Votre demande de réservation a bien été enregistrée et est en cours de traitement.</p>
                
                <div style="background-color: #12121a; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #C5A880;">
                  <h3 style="margin-top: 0; color: #C5A880; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Récapitulatif de votre demande (#${reservationId})</h3>
                  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tr>
                      <td style="padding: 6px 0; color: #8585ad; width: 40%;"><strong>Véhicule :</strong></td>
                      <td style="padding: 6px 0; color: #ffffff;">${vehicleName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #8585ad;"><strong>Date & Heure :</strong></td>
                      <td style="padding: 6px 0; color: #ffffff;">Le ${departureDate} à ${departureTime}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #8585ad;"><strong>Départ :</strong></td>
                      <td style="padding: 6px 0; color: #ffffff;">${pickup}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #8585ad;"><strong>Destination :</strong></td>
                      <td style="padding: 6px 0; color: #ffffff;">${destination}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #8585ad;"><strong>Formule :</strong></td>
                      <td style="padding: 6px 0; color: #ffffff;">${formulaLabel}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #8585ad;"><strong>Estimation :</strong></td>
                      <td style="padding: 6px 0; color: #C5A880; font-size: 15px; font-weight: bold;">${totalPrice.toLocaleString('fr-FR')} FCFA</td>
                    </tr>
                  </table>
                </div>
                
                <!-- CTA BUTTON FOR SEE MY ORDERS -->
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${bookingsLink}" style="display: inline-block; background-color: #C5A880; color: #000000; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 14px; font-weight: bold; text-decoration: none; padding: 12px 35px; border-radius: 8px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 15px rgba(197, 168, 128, 0.25);">Voir mes commandes</a>
                </div>

                <p style="font-size: 14px; line-height: 1.5; color: #a3a3c2;">Un e-mail de validation officielle de votre commande vous sera envoyé dans les plus brefs délais par notre service de répartition.</p>
                <p style="font-size: 14px; line-height: 1.5; color: #a3a3c2;">Nos équipes se tiennent à votre entière disposition.</p>
              </div>
              
              <div style="text-align: center; padding-top: 20px; border-top: 1px solid #1f1f2e; font-size: 11px; color: #5c5c7a;">
                <p>Cet e-mail a été envoyé automatiquement suite à votre demande sur Easy by saver.</p>
                <p>&copy; ${new Date().getFullYear()} Easy by saver. Tous droits réservés.</p>
              </div>
            </div>
          `;

          sendRealEmail(user.email, emailSubject, emailText, emailHtml).catch(err => {
            console.error("[Notification Error] Email dispatch failed async:", err);
          });
        }

        if (user.phone) {
          const smsMessage = `Easy by saver: Bonjour ${user.name}. Votre demande de reservation #${reservationId} a bien ete enregistree. Vous recevrez un e-mail de validation d'ici peu. Merci.`;
          sendRealSMS(user.phone, smsMessage).catch(err => {
            console.error("[Notification Error] SMS dispatch failed async:", err);
          });
        }

        // ALSO Notify Admin of New Reservation
        try {
          const adminEmails = getAdminEmails(db);
          const adminSubject = `[NOUVELLE RÉSERVATION] Commande #${reservationId} - ${user.name}`;
          const adminLink = `${protocol}://${host}/#admin`;
          const adminText = `ALERTE NOUVELLE RÉSERVATION #${reservationId}\n\n` +
            `Client : ${user.name} (${user.email || 'Sans email'}, ${phone || user.phone || 'Sans tel'})\n` +
            `Véhicule : ${vehicleName}\n` +
            `Date & Heure : Le ${departureDate} à ${departureTime}\n` +
            `Départ : ${pickup}\n` +
            `Destination : ${destination}\n` +
            `Formule : ${formulaLabel}\n` +
            `Montant estimé : ${totalPrice ? totalPrice.toLocaleString('fr-FR') : '0'} FCFA\n\n` +
            `Accédez au tableau de bord pour assigner un chauffeur : ${adminLink}`;

          const adminHtml = `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0c0c12; color: #ffffff; border-radius: 12px; border: 1px solid #1f1f2e;">
              <div style="text-align: center; padding-bottom: 25px; border-bottom: 1px solid #1f1f2e; margin-bottom: 25px;">
                <div style="display: inline-block; background-color: #C5A880; color: #000000; font-family: 'Arial Black', -apple-system, sans-serif; font-weight: 900; font-size: 26px; padding: 12px 30px; border-radius: 6px; letter-spacing: 5px; line-height: 1; margin-bottom: 15px; border: 2px solid #E5C8A0;">EASY</div>
                <h1 style="color: #ffffff; font-size: 20px; font-weight: bold; margin: 0; text-transform: uppercase;">EASY BY SAVER - BACK-OFFICE</h1>
                <p style="color: #a3a3c2; font-size: 12px; margin: 5px 0 0 0;">Notification Administrative de Nouvelle Réservation</p>
              </div>
              
              <div style="padding: 10px 0;">
                <div style="background-color: #1a1708; border-radius: 8px; padding: 15px; margin-bottom: 20px; border-left: 4px solid #C5A880;">
                  <h2 style="margin: 0 0 10px 0; color: #C5A880; font-size: 16px; text-transform: uppercase;">🚨 Nouvelle Commande Entrante (#${reservationId})</h2>
                  <p style="margin: 0; font-size: 14px; color: #e1e1e6;">Une nouvelle réservation a été passée par le client <strong>${user.name}</strong>.</p>
                </div>

                <div style="background-color: #12121a; border-radius: 8px; padding: 15px; margin: 20px 0; border: 1px solid #1f1f2e;">
                  <h3 style="margin-top: 0; color: #a3a3c2; font-size: 13px; text-transform: uppercase;">Détails du Client & de la Course</h3>
                  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tr>
                      <td style="padding: 6px 0; color: #8585ad; width: 40%;"><strong>Client :</strong></td>
                      <td style="padding: 6px 0; color: #ffffff; font-weight: bold;">${user.name}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #8585ad;"><strong>Téléphone :</strong></td>
                      <td style="padding: 6px 0; color: #C5A880;">${phone || user.phone || 'Non renseigné'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #8585ad;"><strong>E-mail :</strong></td>
                      <td style="padding: 6px 0; color: #ffffff;">${user.email || 'Non renseigné'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #8585ad;"><strong>Véhicule :</strong></td>
                      <td style="padding: 6px 0; color: #ffffff;">${vehicleName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #8585ad;"><strong>Date & Heure :</strong></td>
                      <td style="padding: 6px 0; color: #ffffff;">Le ${departureDate} à ${departureTime}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #8585ad;"><strong>Prise en charge :</strong></td>
                      <td style="padding: 6px 0; color: #ffffff;">${pickup}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #8585ad;"><strong>Destination :</strong></td>
                      <td style="padding: 6px 0; color: #ffffff;">${destination}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #8585ad;"><strong>Formule :</strong></td>
                      <td style="padding: 6px 0; color: #ffffff;">${formulaLabel}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #8585ad;"><strong>Prix Total :</strong></td>
                      <td style="padding: 6px 0; color: #C5A880; font-size: 15px; font-weight: bold;">${totalPrice ? totalPrice.toLocaleString('fr-FR') : '0'} FCFA</td>
                    </tr>
                  </table>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${adminLink}" style="display: inline-block; background-color: #C5A880; color: #000000; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 14px; font-weight: bold; text-decoration: none; padding: 12px 35px; border-radius: 8px; text-transform: uppercase;">Ouvrir le Tableau de Bord Admin</a>
                </div>
              </div>
              
              <div style="text-align: center; padding-top: 20px; border-top: 1px solid #1f1f2e; font-size: 11px; color: #5c5c7a;">
                <p>Alerte système générée automatiquement pour l'administration Easy by saver.</p>
              </div>
            </div>
          `;

          for (const adminEmail of adminEmails) {
            sendRealEmail(adminEmail, adminSubject, adminText, adminHtml).catch(err => {
              console.error(`[Notification Error] Admin email failed for ${adminEmail}:`, err);
            });
          }
        } catch (adminNotifErr) {
          console.error("[Notification Error] Failed to process admin new reservation email:", adminNotifErr);
        }
      } catch (notifErr) {
        console.error("[Notification Error] Failed to prepare/send real notifications:", notifErr);
      }

      const driverDetails = finalDriverId ? db.drivers.find(d => d.id === finalDriverId) : null;

      return res.status(201).json({
        message: {
          fr: "Réservation enregistrée avec succès",
          en: "Reservation processed successfully"
        },
        reservation: newReservation,
        driver: driverDetails
      });

    } catch (e: any) {
      console.error(e);
      return res.status(500).json({ error: e.message });
    }
  });

  // GET AUTHENTICATED DRIVER PROFILE
  app.get("/api/drivers/me", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user.role !== "chauffeur") {
        return res.status(403).json({ error: "Secteur réservé aux chauffeurs d'élite" });
      }

      const db = await readDB();
      let driver = db.drivers.find(d => d.userId === user.id);

      // Auto-create driver record if none exists but user has chauffeur role
      if (!driver) {
        driver = {
          id: "drv_" + Math.random().toString(36).substr(2, 9),
          userId: user.id,
          name: user.name,
          phone: user.phone || "+225 00000000",
          email: user.email,
          photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256",
          availability: "disponible",
          status: "disponible",
          rating: 4.8,
          createdAt: new Date().toISOString()
        };
        db.drivers.push(driver);
        await writeDB(db);
      }

      return res.json({ driver });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // UPDATE DRIVER STATUS
  app.put("/api/drivers/me/status", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const { status } = req.body; // "disponible" | "en_mission" | "indisponible"
      if (!status || !["disponible", "en_mission", "indisponible"].includes(status)) {
        return res.status(400).json({ error: "Statut invalide" });
      }

      const db = await readDB();
      const drvIndex = db.drivers.findIndex(d => d.userId === user.id);
      if (drvIndex === -1) {
        return res.status(444).json({ error: "Profil chauffeur introuvable" });
      }

      db.drivers[drvIndex].status = status;
      db.drivers[drvIndex].availability = status;
      await writeDB(db);

      return res.json({ message: "Status mis à jour", driver: db.drivers[drvIndex] });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // GET MISSIONS FOR DRIVER
  app.get("/api/drivers/me/missions", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const db = await readDB();

      const driver = db.drivers.find(d => d.userId === user.id);
      if (!driver) {
        return res.status(404).json({ error: "Chauffeur non enregistré" });
      }

      // Filter reservations assigned to this driver or created and pending (for matching simulation)
      const driverMissions = db.reservations.filter(r => r.driverId === driver.id && r.status !== "cancelled");

      // Join with vehicle details, options, and client data
      const mappedMissions = driverMissions.map(m => {
        const client = db.users.find(u => u.id === m.userId);
        const vehicle = db.vehicles.find(v => v.id === m.vehicleId);
        const optionsDetails = db.reservation_options.filter(o => o.reservationId === m.id);
        const locations = db.trip_locations ? db.trip_locations.filter(l => l.reservationId === m.id) : [];

        return {
          ...m,
          clientName: client ? client.name : "Client",
          clientPhone: client ? client.phone : "",
          vehicle,
          optionsDetails,
          locations
        };
      });

      return res.json({ missions: mappedMissions });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // GET SHIFTS OF LOGGED IN DRIVER
  app.get("/api/drivers/me/shifts", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const db = await readDB();
      const driver = db.drivers.find(d => d.userId === user.id);
      if (!driver) {
        return res.status(404).json({ error: "Chauffeur non trouvé" });
      }
      if (!db.shifts) db.shifts = [];
      const driverShifts = db.shifts.filter(s => s.driverId === driver.id);
      return res.json({ shifts: driverShifts });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // CREATE OR UPDATE LOGGED IN DRIVER SHIFT
  app.post("/api/drivers/me/shifts", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const db = await readDB();
      const driver = db.drivers.find(d => d.userId === user.id);
      if (!driver) {
        return res.status(404).json({ error: "Chauffeur non trouvé" });
      }

      const {
        shiftId,
        startConfirmed,
        startKm,
        startDepartureTime,
        startRechargeChecked,
        startInternetChecked,
        startPapersChecked,
        endConfirmed,
        endExteriorPhoto,
        endDashPhoto,
        endKm,
        endArrivalTime,
        endDailyReport,
        endRechargeProofPhoto,
        endPassationConfirmed
      } = req.body;

      if (!db.shifts) db.shifts = [];

      let shiftLog: any = null;

      if (shiftId) {
        const existingIdx = db.shifts.findIndex(s => s.id === shiftId);
        if (existingIdx !== -1) {
          shiftLog = db.shifts[existingIdx];
        }
      }

      if (!shiftLog) {
        // Create new shift log
        shiftLog = {
          id: "shift_" + Math.random().toString(36).substr(2, 9),
          driverId: driver.id,
          driverName: driver.name,
          vehicleId: driver.vehicleId || "v_berline_n1",
          date: new Date().toISOString().split("T")[0],
          createdAt: new Date().toISOString()
        };
        db.shifts.push(shiftLog);
      }

      // Update fields
      if (startConfirmed !== undefined) {
        shiftLog.startConfirmed = startConfirmed;
        if (!shiftLog.startTime) {
          shiftLog.startTime = new Date().toISOString();
        }
        shiftLog.startKm = startKm;
        shiftLog.startDepartureTime = startDepartureTime;
        shiftLog.startRechargeChecked = startRechargeChecked;
        shiftLog.startInternetChecked = startInternetChecked;
        shiftLog.startPapersChecked = startPapersChecked;
        shiftLog.startDashPhoto = "https://images.unsplash.com/photo-1549399542-7eed3a85d611?q=80&w=256";
      }

      if (endConfirmed !== undefined) {
        shiftLog.endConfirmed = endConfirmed;
        shiftLog.endTime = new Date().toISOString();
        shiftLog.endKm = endKm;
        shiftLog.endArrivalTime = endArrivalTime;
        shiftLog.endExteriorPhoto = endExteriorPhoto || "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?q=80&w=256";
        shiftLog.endDashPhoto = "https://images.unsplash.com/photo-1549399542-7eed3a85d611?q=80&w=256";
        shiftLog.endDailyReport = endDailyReport || { isClean: true, hasIncident: false, incidentDetails: "", batteryLevelEnd: 90, observations: "" };
        shiftLog.endRechargeProofPhoto = endRechargeProofPhoto || "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=256";
        shiftLog.endPassationConfirmed = endPassationConfirmed;
      }

      await writeDB(db);
      return res.json({ success: true, shift: shiftLog });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // GET SHIFTS FOR ADMIN
  app.get("/api/admin/shifts", requireAdmin, async (req, res) => {
    try {
      const db = await readDB();
      return res.json(db.shifts || []);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // UPDATE RESERVATION STATUS (MISSION STEPS)
  app.put("/api/reservations/:id/status", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body; // assigned -> en_route -> arrived -> in_progress -> completed | cancelled
      const user = (req as any).user;

      const db = await readDB();
      const resIndex = db.reservations.findIndex(r => r.id === id);
      if (resIndex === -1) {
        return res.status(404).json({ error: "Réservation introuvable" });
      }

      // Check if driver has right to modify
      const driver = db.drivers.find(d => d.userId === user.id);
      if (!driver && user.role !== "admin") {
        return res.status(403).json({ error: "Accès non autorisé" });
      }

      const activeRes = db.reservations[resIndex];
      const prevStatus = activeRes.status;

      // Apply status change
      activeRes.status = status;

      // Update driver status automatically depending on ride step
      if (driver) {
        if (status === "completed" || status === "cancelled") {
          const drvIndex = db.drivers.findIndex(d => d.id === driver.id);
          if (drvIndex !== -1) {
            db.drivers[drvIndex].status = "disponible";
            db.drivers[drvIndex].availability = "disponible";
          }
        } else {
          // any of: assigned, en_route, arrived, in_progress
          const drvIndex = db.drivers.findIndex(d => d.id === driver.id);
          if (drvIndex !== -1) {
            db.drivers[drvIndex].status = "en_mission";
            db.drivers[drvIndex].availability = "en_mission";
          }
        }
      }

      await writeDB(db);

      // Broadcast update to real-time Tracking space
      if ((global as any).ioInstance) {
        (global as any).ioInstance.to(`room_${id}`).emit("trip:status_update", {
          reservationId: id,
          status,
          prevStatus
        });
      }

      return res.json({ message: "Statut mis à jour avec succès", reservation: activeRes });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // GET SINGLE RESERVATION FOR TRACKING
  app.get("/api/reservations/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const db = await readDB();

      const reservation = db.reservations.find(r => r.id === id);
      if (!reservation) {
        return res.status(404).json({ error: "Réservation introuvable" });
      }

      const client = db.users.find(u => u.id === reservation.userId);
      const driver = db.drivers.find(d => d.id === reservation.driverId);
      const vehicle = db.vehicles.find(v => v.id === reservation.vehicleId);
      const locations = db.trip_locations ? db.trip_locations.filter(l => l.reservationId === id) : [];
      const optionsDetails = db.reservation_options.filter(o => o.reservationId === id);

      return res.json({
        reservation,
        client: client ? { name: client.name, phone: client.phone } : null,
        driver: driver ? {
          id: driver.id,
          name: driver.name,
          phone: driver.phone,
          photo: driver.photo || "",
          availability: driver.status,
          rating: driver.rating || 4.8
        } : null,
        vehicle,
        locations,
        optionsDetails
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // Get Reservations List
  app.get("/api/reservations", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const db = await readDB();

      let result = [];
      if (user.role === "admin") {
        result = db.reservations;
      } else {
        result = db.reservations.filter(r => r.userId === user.id);
      }

      // Map driver names and option details
      const mapped = result.map(res => {
        const driver = db.drivers.find(d => d.id === res.driverId);
        const optionsDetails = db.reservation_options.filter(o => o.reservationId === res.id);
        const client = db.users.find(u => u.id === res.userId);
        return {
          ...res,
          driverName: driver ? driver.name : null,
          driverPhone: driver ? driver.phone : null,
          clientName: client ? client.name : "Client",
          clientPhone: client ? client.phone : "",
          optionsDetails
        };
      });

      return res.json({ reservations: mapped });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // Cancel Reservation by Client
  app.post("/api/reservations/:id/cancel", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const db = await readDB();

      const resIndex = db.reservations.findIndex(r => r.id === id);
      if (resIndex === -1) {
        return res.status(404).json({ error: "Réservation introuvable" });
      }

      const reservation = db.reservations[resIndex];

      // Only the client who made it or an admin can cancel it
      if (reservation.userId !== user.id && user.role !== "admin") {
        return res.status(403).json({ error: "Vous n'êtes pas autorisé à annuler cette réservation" });
      }

      if (reservation.status === "cancelled") {
        return res.status(400).json({ error: "Cette réservation est déjà annulée" });
      }

      if (reservation.status === "completed") {
        return res.status(400).json({ error: "Impossible d'annuler une course déjà terminée" });
      }

      const prevStatus = reservation.status;
      reservation.status = "cancelled";

      // If a driver was assigned, free them
      if (reservation.driverId) {
        const drvIndex = db.drivers.findIndex(d => d.id === reservation.driverId);
        if (drvIndex !== -1) {
          db.drivers[drvIndex].status = "disponible";
          db.drivers[drvIndex].availability = "disponible";
        }
      }

      await writeDB(db);

      // Broadcast update
      if ((global as any).ioInstance) {
        (global as any).ioInstance.to(`room_${id}`).emit("trip:status_update", {
          reservationId: id,
          status: "cancelled",
          prevStatus
        });
      }

      // SEND CANCELLATION EMAILS (CLIENT & ADMIN)
      try {
        const client = db.users.find(u => u.id === reservation.userId);
        const clientName = reservation.clientName || (client ? client.name : "Client");
        const clientEmail = reservation.clientEmail || (client ? client.email : null);
        const clientPhone = reservation.clientPhone || (client ? client.phone : null);

        const vehicle = db.vehicles.find(v => v.id === reservation.vehicleId);
        const vehicleName = vehicle ? `${vehicle.brand} ${vehicle.name}` : (reservation.vehicleId === "N1" ? "Berline Premium (N1)" : reservation.vehicleId === "N2" ? "Berline Prestige (N2)" : "Berline Executive (N3)");
        const formulaLabel = reservation.formula === "hourly" ? "À l'heure" : reservation.formula === "halfday" ? "Demi-journée" : "Journée complète";

        const protocol = req.secure ? "https" : "http";
        const host = req.get("host");
        const bookingsLink = `${protocol}://${host}/#commandes`;
        const adminLink = `${protocol}://${host}/#admin`;

        // 1. Notify Client of Cancellation
        if (clientEmail) {
          const clientSubject = `Confirmation d'annulation de votre commande #${reservation.id} - Easy by saver`;
          const clientText = `Bonjour ${clientName},\n\n` +
            `Nous vous confirmons que votre demande de réservation #${reservation.id} a bien été annulée.\n\n` +
            `RAPPEL DE LA COMMANDE ANNULÉE :\n` +
            `- Référence : #${reservation.id}\n` +
            `- Véhicule : ${vehicleName}\n` +
            `- Date & Heure : Le ${reservation.departureDate} à ${reservation.departureTime}\n` +
            `- Prise en charge : ${reservation.pickup}\n` +
            `- Destination : ${reservation.destination}\n` +
            `- Montant : ${reservation.totalPrice ? reservation.totalPrice.toLocaleString('fr-FR') : '0'} FCFA\n\n` +
            `Si vous désirez planifier une autre course ou si vous avez des questions, nos équipes restent à votre entière disposition.\n\n` +
            `Découvrez nos services ou passez une nouvelle commande ici : ${bookingsLink}\n\n` +
            `Cordialement,\n` +
            `L'équipe Easy by saver\n` +
            `https://easybysaver.com`;

          const clientHtml = `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0c0c12; color: #ffffff; border-radius: 12px; border: 1px solid #1f1f2e;">
              <div style="text-align: center; padding-bottom: 25px; border-bottom: 1px solid #1f1f2e; margin-bottom: 25px;">
                <div style="display: inline-block; background-color: #C5A880; color: #000000; font-family: 'Arial Black', -apple-system, sans-serif; font-weight: 900; font-size: 26px; padding: 12px 30px; border-radius: 6px; letter-spacing: 5px; line-height: 1; margin-bottom: 15px; border: 2px solid #E5C8A0;">EASY</div>
                <h1 style="color: #ffffff; font-size: 22px; font-weight: bold; margin: 0; text-transform: uppercase;">EASY BY SAVER</h1>
                <p style="color: #a3a3c2; font-size: 13px; margin: 6px 0 0 0; font-family: Georgia, serif; font-style: italic;">Electric Automobile to Save You</p>
              </div>
              
              <div style="padding: 10px 0;">
                <div style="background-color: #2a1215; border-radius: 8px; padding: 15px; margin-bottom: 20px; border-left: 4px solid #ff4444;">
                  <h2 style="margin: 0 0 8px 0; color: #ff6666; font-size: 16px; text-transform: uppercase;">Commande Annulée (#${reservation.id})</h2>
                  <p style="margin: 0; font-size: 14px; color: #e1e1e6;">Bonjour <strong>${clientName}</strong>, votre demande de réservation a bien été annulée comme demandé.</p>
                </div>

                <div style="background-color: #12121a; border-radius: 8px; padding: 15px; margin: 20px 0; border: 1px solid #1f1f2e;">
                  <h3 style="margin-top: 0; color: #8585ad; font-size: 13px; text-transform: uppercase;">Détails du trajet concerné</h3>
                  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tr>
                      <td style="padding: 6px 0; color: #8585ad; width: 40%;"><strong>Référence :</strong></td>
                      <td style="padding: 6px 0; color: #ffffff;">#${reservation.id}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #8585ad;"><strong>Véhicule :</strong></td>
                      <td style="padding: 6px 0; color: #ffffff;">${vehicleName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #8585ad;"><strong>Date & Heure :</strong></td>
                      <td style="padding: 6px 0; color: #ffffff;">Le ${reservation.departureDate} à ${reservation.departureTime}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #8585ad;"><strong>Prise en charge :</strong></td>
                      <td style="padding: 6px 0; color: #ffffff;">${reservation.pickup}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #8585ad;"><strong>Destination :</strong></td>
                      <td style="padding: 6px 0; color: #ffffff;">${reservation.destination}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #8585ad;"><strong>Formule :</strong></td>
                      <td style="padding: 6px 0; color: #ffffff;">${formulaLabel}</td>
                    </tr>
                  </table>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${bookingsLink}" style="display: inline-block; background-color: #C5A880; color: #000000; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 14px; font-weight: bold; text-decoration: none; padding: 12px 35px; border-radius: 8px; text-transform: uppercase;">Voir mes commandes / Effectuer un nouveau trajet</a>
                </div>

                <p style="font-size: 14px; line-height: 1.5; color: #a3a3c2;">Nos équipes se tiennent à votre disposition pour toute information complémentaire.</p>
              </div>
              
              <div style="text-align: center; padding-top: 20px; border-top: 1px solid #1f1f2e; font-size: 11px; color: #5c5c7a;">
                <p>&copy; ${new Date().getFullYear()} Easy by saver. Tous droits réservés.</p>
              </div>
            </div>
          `;

          sendRealEmail(clientEmail, clientSubject, clientText, clientHtml).catch(err => {
            console.error("[Notification Error] Client cancellation email failed async:", err);
          });
        }

        // 2. Notify Admin of Cancellation
        const adminEmails = getAdminEmails(db);
        const adminSubject = `[ANNULATION] La commande #${reservation.id} a été annulée - ${clientName}`;
        const adminText = `ALERTE ANNULATION COMMANDE #${reservation.id}\n\n` +
          `Le client ${clientName} (${clientEmail || 'Sans email'}, ${clientPhone || 'Sans tel'}) a annulé sa réservation.\n\n` +
          `DÉTAILS DU TRAJET :\n` +
          `- Référence : #${reservation.id}\n` +
          `- Véhicule : ${vehicleName}\n` +
          `- Date & Heure : Le ${reservation.departureDate} à ${reservation.departureTime}\n` +
          `- Prise en charge : ${reservation.pickup}\n` +
          `- Destination : ${reservation.destination}\n` +
          `- Montant : ${reservation.totalPrice ? reservation.totalPrice.toLocaleString('fr-FR') : '0'} FCFA\n\n` +
          `La commande reste conservée dans le tableau de bord avec le tampon "ANNULÉE".\n` +
          `Consultez le back-office : ${adminLink}`;

        const adminHtml = `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0c0c12; color: #ffffff; border-radius: 12px; border: 1px solid #1f1f2e;">
            <div style="text-align: center; padding-bottom: 25px; border-bottom: 1px solid #1f1f2e; margin-bottom: 25px;">
              <div style="display: inline-block; background-color: #C5A880; color: #000000; font-family: 'Arial Black', -apple-system, sans-serif; font-weight: 900; font-size: 26px; padding: 12px 30px; border-radius: 6px; letter-spacing: 5px; line-height: 1; margin-bottom: 15px; border: 2px solid #E5C8A0;">EASY</div>
              <h1 style="color: #ffffff; font-size: 20px; font-weight: bold; margin: 0; text-transform: uppercase;">EASY BY SAVER - BACK-OFFICE</h1>
              <p style="color: #a3a3c2; font-size: 12px; margin: 5px 0 0 0;">Notification d'Annulation de Commande</p>
            </div>
            
            <div style="padding: 10px 0;">
              <div style="background-color: #2a1215; border-radius: 8px; padding: 15px; margin-bottom: 20px; border-left: 4px solid #ff4444;">
                <h2 style="margin: 0 0 10px 0; color: #ff6666; font-size: 16px; text-transform: uppercase;">⚠️ Annulation de Commande (#${reservation.id})</h2>
                <p style="margin: 0; font-size: 14px; color: #e1e1e6;">Le client <strong>${clientName}</strong> a annulé sa réservation de course.</p>
              </div>

              <div style="background-color: #12121a; border-radius: 8px; padding: 15px; margin: 20px 0; border: 1px solid #1f1f2e;">
                <h3 style="margin-top: 0; color: #a3a3c2; font-size: 13px; text-transform: uppercase;">Informations de la Commande</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                  <tr>
                    <td style="padding: 6px 0; color: #8585ad; width: 40%;"><strong>Réf Commande :</strong></td>
                    <td style="padding: 6px 0; color: #ffffff; font-weight: bold;">#${reservation.id}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #8585ad;"><strong>Client :</strong></td>
                    <td style="padding: 6px 0; color: #ffffff;">${clientName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #8585ad;"><strong>Téléphone :</strong></td>
                    <td style="padding: 6px 0; color: #C5A880;">${clientPhone || 'Non renseigné'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #8585ad;"><strong>E-mail :</strong></td>
                    <td style="padding: 6px 0; color: #ffffff;">${clientEmail || 'Non renseigné'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #8585ad;"><strong>Date & Heure :</strong></td>
                    <td style="padding: 6px 0; color: #ffffff;">Le ${reservation.departureDate} à ${reservation.departureTime}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #8585ad;"><strong>Départ :</strong></td>
                    <td style="padding: 6px 0; color: #ffffff;">${reservation.pickup}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #8585ad;"><strong>Destination :</strong></td>
                    <td style="padding: 6px 0; color: #ffffff;">${reservation.destination}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #8585ad;"><strong>Montant :</strong></td>
                    <td style="padding: 6px 0; color: #C5A880; font-size: 15px; font-weight: bold;">${reservation.totalPrice ? reservation.totalPrice.toLocaleString('fr-FR') : '0'} FCFA</td>
                  </tr>
                </table>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${adminLink}" style="display: inline-block; background-color: #C5A880; color: #000000; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 14px; font-weight: bold; text-decoration: none; padding: 12px 35px; border-radius: 8px; text-transform: uppercase;">Ouvrir le Tableau de Bord Admin</a>
              </div>
            </div>
            
            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #1f1f2e; font-size: 11px; color: #5c5c7a;">
              <p>Notification système d'annulation pour l'administration Easy by saver.</p>
            </div>
          </div>
        `;

        for (const adminEmail of adminEmails) {
          sendRealEmail(adminEmail, adminSubject, adminText, adminHtml).catch(err => {
            console.error(`[Notification Error] Admin cancellation email failed for ${adminEmail}:`, err);
          });
        }
      } catch (cancellationErr) {
        console.error("[Notification Error] Failed to process cancellation email dispatches:", cancellationErr);
      }

      return res.json({ success: true, message: "Réservation annulée avec succès", reservation });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // Modify Reservation by Client (Only for pending_assignment)
  app.put("/api/reservations/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const db = await readDB();

      const resIndex = db.reservations.findIndex(r => r.id === id);
      if (resIndex === -1) {
        return res.status(404).json({ error: "Réservation introuvable" });
      }

      const reservation = db.reservations[resIndex];

      // Only the client who made it or an admin can modify it
      if (reservation.userId !== user.id && user.role !== "admin") {
        return res.status(403).json({ error: "Vous n'êtes pas autorisé à modifier cette réservation" });
      }

      // Can only modify pending_assignment reservations
      if (reservation.status !== "pending_assignment" && user.role !== "admin") {
        return res.status(400).json({ error: "Seules les réservations en attente d'attribution de chauffeur peuvent être modifiées" });
      }

      const { pickup, destination, departureDate, departureTime, options } = req.body;

      if (pickup !== undefined) reservation.pickup = pickup;
      if (destination !== undefined) reservation.destination = destination;
      if (departureDate !== undefined) reservation.departureDate = departureDate;
      if (departureTime !== undefined) reservation.departureTime = departureTime;
      if (options !== undefined && Array.isArray(options)) {
        reservation.options = options;
      }

      await writeDB(db);

      return res.json({ success: true, message: "Réservation modifiée avec succès", reservation });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // Delete Reservation by Client (Only for cancelled or completed)
  app.delete("/api/reservations/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const db = await readDB();

      const resIndex = db.reservations.findIndex(r => r.id === id);
      if (resIndex === -1) {
        return res.status(404).json({ error: "Réservation introuvable" });
      }

      const reservation = db.reservations[resIndex];

      // Only the client who made it or an admin can delete it
      if (reservation.userId !== user.id && user.role !== "admin") {
        return res.status(403).json({ error: "Vous n'êtes pas autorisé à supprimer cette réservation" });
      }

      // Can only delete cancelled or completed reservations
      if (reservation.status !== "cancelled" && reservation.status !== "completed" && user.role !== "admin") {
        return res.status(400).json({ error: "Vous ne pouvez supprimer que les réservations terminées ou annulées" });
      }

      db.reservations.splice(resIndex, 1);
      await writeDB(db);

      return res.json({ success: true, message: "Réservation supprimée du tableau de bord" });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // Assign Driver manually (Task 4 segment manual process)
  app.post("/api/reservations/:id/assign-driver", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { id } = req.params;
      const { driverId } = req.body;

      if (!driverId) {
        return res.status(400).json({ error: "Missing driverId" });
      }

      const db = await readDB();
      const resIndex = db.reservations.findIndex(r => r.id === id);
      if (resIndex === -1) {
        return res.status(404).json({ error: "Reservation not found" });
      }

      const driver = db.drivers.find(d => d.id === driverId);
      if (!driver) {
        return res.status(404).json({ error: "Chauffeur non trouvé" });
      }

      db.reservations[resIndex].driverId = driverId;
      if (driver.vehicleId) {
        db.reservations[resIndex].vehicleId = driver.vehicleId;
      }
      db.reservations[resIndex].status = "confirmed";
      await writeDB(db);

      const reservation = db.reservations[resIndex];
      const client = db.users.find(u => u.id === reservation.userId);
      const vehicle = db.vehicles.find(v => v.id === reservation.vehicleId);
      const vehicleName = vehicle ? `${vehicle.brand} ${vehicle.name}` : (reservation.vehicleId === "N1" ? "Berline Premium (N1)" : reservation.vehicleId === "N2" ? "Berline Prestige (N2)" : "Berline Executive (N3)");
      const formulaLabel = reservation.formula === "hourly" ? "À l'heure" : reservation.formula === "halfday" ? "Demi-journée" : "Journée complète";

      // REAL NOTIFICATIONS (Email to Client & Driver, plus SMS queues)
      try {
        const protocol = req.secure ? "https" : "http";
        const host = req.get("host");
        const bookingsLink = `${protocol}://${host}/#commandes`;

        // 1. Notify Client via Email
        if (client && client.email) {
          const clientEmailSubject = `Votre Chauffeur Easy by saver a été assigné ! (Référence #${reservation.id})`;
          const clientEmailText = `Bonjour ${client.name},\n\n` +
            `Nous avons le plaisir de vous informer que votre demande de réservation #${reservation.id} a été validée officiellement.\n\n` +
            `VOTRE CHAUFFEUR D'ÉLITE :\n` +
            `- Nom : ${driver.name}\n` +
            `- Téléphone : ${driver.phone}\n\n` +
            `DÉTAILS DE LA COURSE :\n` +
            `- Véhicule : ${vehicleName}\n` +
            `- Date & Heure : Le ${reservation.departureDate} à ${reservation.departureTime}\n` +
            `- Lieu de prise en charge : ${reservation.pickup}\n` +
            `- Destination : ${reservation.destination}\n` +
            `- Formule : ${formulaLabel}\n` +
            `- Montant estimé : ${reservation.totalPrice.toLocaleString('fr-FR')} FCFA\n\n` +
            `Vous pouvez suivre tous vos trajets d'élite sur votre espace "Mes Commandes" en cliquant ici : ${bookingsLink}\n\n` +
            `Votre chauffeur se présentera à l'adresse indiquée avec la rigueur et la discrétion caractéristiques de notre service.\n\n` +
            `Nous vous remercions pour votre confiance.\n\n` +
            `Cordialement,\n` +
            `L'équipe Easy by saver\n` +
            `https://easybysaver.com`;

          const clientEmailHtml = `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0c0c12; color: #ffffff; border-radius: 12px; border: 1px solid #1f1f2e;">
              <div style="text-align: center; padding-bottom: 25px; border-bottom: 1px solid #1f1f2e; margin-bottom: 25px;">
                <!-- BEAUTIFUL DESIGN LOGO -->
                <div style="display: inline-block; background-color: #C5A880; color: #000000; font-family: 'Arial Black', -apple-system, sans-serif; font-weight: 900; font-size: 26px; padding: 12px 30px; border-radius: 6px; letter-spacing: 5px; line-height: 1; margin-bottom: 15px; border: 2px solid #E5C8A0; box-shadow: 0 4px 20px rgba(197, 168, 128, 0.25);">EASY</div>
                <!-- REPLACED BRANDING TEXT -->
                <h1 style="color: #ffffff; font-size: 22px; font-weight: bold; margin: 0; text-transform: uppercase; letter-spacing: 2px;">EASY BY SAVER</h1>
                <p style="color: #a3a3c2; font-size: 13px; margin: 6px 0 0 0; font-family: Georgia, serif; font-style: italic;">Electric Automobile to Save You</p>
              </div>
              
              <div style="padding: 20px 0;">
                <p style="font-size: 16px; line-height: 1.5; color: #e1e1e6;">Bonjour <strong>${client.name}</strong>,</p>
                <p style="font-size: 15px; line-height: 1.5; color: #a3a3c2;">Nous avons le plaisir de vous informer que votre demande de réservation <strong>#${reservation.id}</strong> a été validée officiellement.</p>
                
                <div style="background-color: #12121a; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #C5A880;">
                  <h3 style="margin-top: 0; color: #C5A880; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Votre Chauffeur Privé Assigné</h3>
                  <p style="margin: 6px 0; font-size: 14px; color: #ffffff;"><strong>Chauffeur :</strong> ${driver.name}</p>
                  <p style="margin: 6px 0; font-size: 14px; color: #ffffff;"><strong>Téléphone :</strong> <a href="tel:${driver.phone}" style="color: #C5A880; text-decoration: none;">${driver.phone}</a></p>
                </div>

                <div style="background-color: #12121a; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 1px solid #1f1f2e;">
                  <h3 style="margin-top: 0; color: #8585ad; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Rappel des détails de la course</h3>
                  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tr>
                      <td style="padding: 6px 0; color: #8585ad; width: 40%;"><strong>Véhicule :</strong></td>
                      <td style="padding: 6px 0; color: #ffffff;">${vehicleName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #8585ad;"><strong>Date & Heure :</strong></td>
                      <td style="padding: 6px 0; color: #ffffff;">Le ${reservation.departureDate} à ${reservation.departureTime}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #8585ad;"><strong>Départ :</strong></td>
                      <td style="padding: 6px 0; color: #ffffff;">${reservation.pickup}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #8585ad;"><strong>Destination :</strong></td>
                      <td style="padding: 6px 0; color: #ffffff;">${reservation.destination}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #8585ad;"><strong>Formule :</strong></td>
                      <td style="padding: 6px 0; color: #ffffff;">${formulaLabel}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #8585ad;"><strong>Montant estimé :</strong></td>
                      <td style="padding: 6px 0; color: #C5A880; font-size: 15px; font-weight: bold;">${reservation.totalPrice.toLocaleString('fr-FR')} FCFA</td>
                    </tr>
                  </table>
                </div>
                
                <!-- CTA BUTTON FOR SEE MY ORDERS -->
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${bookingsLink}" style="display: inline-block; background-color: #C5A880; color: #000000; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 14px; font-weight: bold; text-decoration: none; padding: 12px 35px; border-radius: 8px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 15px rgba(197, 168, 128, 0.25);">Voir mes commandes<a>
                </div>

                <p style="font-size: 14px; line-height: 1.5; color: #a3a3c2;">Votre chauffeur prendra contact avec vous si nécessaire. Nos équipes restent également à votre entière écoute.</p>
              </div>
              
              <div style="text-align: center; padding-top: 20px; border-top: 1px solid #1f1f2e; font-size: 11px; color: #5c5c7a;">
                <p>Cet e-mail a été envoyé automatiquement de la part de Easy by saver.</p>
                <p>&copy; ${new Date().getFullYear()} Easy by saver. Tous droits réservés.</p>
              </div>
            </div>
          `;

          sendRealEmail(client.email, clientEmailSubject, clientEmailText, clientEmailHtml).catch(err => {
            console.error("[Notification Error] Client assignment email dispatch failed async:", err);
          });
        }

        // 2. Notify Driver via Email
        if (driver && driver.email) {
          const driverEmailSubject = `[MISSION EASY] Nouvelle course assignée : #${reservation.id}`;
          const driverEmailText = `Bonjour ${driver.name},\n\n` +
            `Une nouvelle mission de service vous a été officiellement assignée par l'administration Easy by saver.\n\n` +
            `DÉTAILS DU PASSAGER :\n` +
            `- Nom : ${client ? client.name : "Client Easy by saver"}\n` +
            `- Téléphone : ${client ? client.phone : "Non fourni"}\n\n` +
            `DÉTAILS DE LA COURSE :\n` +
            `- Référence : #${reservation.id}\n` +
            `- Date & Heure : Le ${reservation.departureDate} à ${reservation.departureTime}\n` +
            `- Lieu de prise en charge : ${reservation.pickup}\n` +
            `- Destination : ${reservation.destination}\n` +
            `- Formule : ${formulaLabel}\n` +
            `- Options de service : ${reservation.options && reservation.options.length > 0 ? reservation.options.join(", ") : "Aucune"}\n\n` +
            `Veuillez préparer minutieusement votre véhicule, vérifier sa propreté, et vous présenter 15 minutes en avance au point de rendez-vous.\n\n` +
            `Bonne route et excellent service,\n` +
            `La Direction Easy by saver`;

          const driverEmailHtml = `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0c0c12; color: #ffffff; border-radius: 12px; border: 1px solid #1f1f2e;">
              <div style="text-align: center; padding-bottom: 25px; border-bottom: 1px solid #1f1f2e; margin-bottom: 25px;">
                <!-- BEAUTIFUL DESIGN LOGO -->
                <div style="display: inline-block; background-color: #C5A880; color: #000000; font-family: 'Arial Black', -apple-system, sans-serif; font-weight: 900; font-size: 26px; padding: 12px 30px; border-radius: 6px; letter-spacing: 5px; line-height: 1; margin-bottom: 15px; border: 2px solid #E5C8A0; box-shadow: 0 4px 20px rgba(197, 168, 128, 0.25);">EASY</div>
                <!-- REPLACED BRANDING TEXT -->
                <h1 style="color: #ffffff; font-size: 20px; font-weight: bold; margin: 0; text-transform: uppercase; letter-spacing: 2px;">EASY BY SAVER</h1>
                <p style="color: #a3a3c2; font-size: 11px; margin: 5px 0 0 0; font-family: Georgia, serif; font-style: italic;">Electric Automobile to Save You</p>
              </div>
              
              <div style="padding: 20px 0;">
                <p style="font-size: 16px; line-height: 1.5; color: #e1e1e6;">Bonjour <strong>${driver.name}</strong>,</p>
                <p style="font-size: 15px; line-height: 1.5; color: #a3a3c2;">Une nouvelle mission de service vous a été affectée. Merci d'en prendre connaissance immédiatement et de vous préparer en conséquence.</p>
                
                <div style="background-color: #12121a; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #C5A880;">
                  <h3 style="margin-top: 0; color: #C5A880; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Fiche de Mission (#${reservation.id})</h3>
                  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tr>
                      <td style="padding: 6px 0; color: #8585ad; width: 40%;"><strong>Passager d'élite :</strong></td>
                      <td style="padding: 6px 0; color: #ffffff; font-weight: bold;">${client ? client.name : "Client Easy by saver"}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #8585ad;"><strong>Téléphone client :</strong></td>
                      <td style="padding: 6px 0; color: #ffffff;"><a href="tel:${client ? client.phone : ''}" style="color: #C5A880; text-decoration: none;">${client ? client.phone : 'Non fourni'}</a></td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #8585ad;"><strong>Date & Heure :</strong></td>
                      <td style="padding: 6px 0; color: #ffffff;">Le ${reservation.departureDate} à ${reservation.departureTime}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #8585ad;"><strong>Lieu de départ :</strong></td>
                      <td style="padding: 6px 0; color: #ffffff;">${reservation.pickup}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #8585ad;"><strong>Destination :</strong></td>
                      <td style="padding: 6px 0; color: #ffffff;">${reservation.destination}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #8585ad;"><strong>Formule retenue :</strong></td>
                      <td style="padding: 6px 0; color: #ffffff;">${formulaLabel}</td>
                    </tr>
                  </table>
                </div>
                
                <p style="font-size: 13px; line-height: 1.5; color: #e1e1e6; background-color: #2a1215; padding: 10px; border-radius: 6px; border-left: 3px solid #ff4444;">
                  <strong>Rappel sécurité & standing :</strong> Tenue réglementaire obligatoire (costume sombre, chemise blanche, cravate), accueil pancarte rigoureux, courtoisie absolue, véhicule parfaitement propre intérieurement et extérieurement. Présentation impérative 15 minutes en avance.
                </p>
              </div>
              
              <div style="text-align: center; padding-top: 20px; border-top: 1px solid #1f1f2e; font-size: 11px; color: #5c5c7a;">
                <p>&copy; ${new Date().getFullYear()} Easy by saver. Tous droits réservés.</p>
              </div>
            </div>
          `;

          sendRealEmail(driver.email, driverEmailSubject, driverEmailText, driverEmailHtml).catch(err => {
            console.error("[Notification Error] Driver assignment email dispatch failed async:", err);
          });
        }

        // 3. Notify Client via SMS
        if (client && client.phone) {
          const clientSMS = `Easy by saver: Votre chauffeur ${driver.name} (${driver.phone}) est confirme pour votre course du ${reservation.departureDate} a ${reservation.departureTime}. Bon voyage !`;
          sendRealSMS(client.phone, clientSMS).catch(err => {
            console.error("[Notification Error] Client SMS failed async:", err);
          });
        }

        // 4. Notify Driver via SMS
        if (driver && driver.phone) {
          const driverSMS = `Easy by saver: Nouvelle mission #${reservation.id} assignee. Client: ${client ? client.name : 'Client'} (${client ? client.phone : ''}) le ${reservation.departureDate} a ${reservation.departureTime}. Prise en charge: ${reservation.pickup}.`;
          sendRealSMS(driver.phone, driverSMS).catch(err => {
            console.error("[Notification Error] Driver SMS failed async:", err);
          });
        }
      } catch (notifErr) {
        console.error("[Notification Error] Failed to process dispatch notifications:", notifErr);
      }

      return res.json({
        success: true,
        message: "Chauffeur affecté avec succès",
        reservation: db.reservations[resIndex],
        driverName: driver.name
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // 2. Quotes / Devis Management Workflow (Task 3)
  app.post("/api/quotes", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const { vehicleId, details } = req.body;

      if (!vehicleId || !details || !details.departureDate || !details.departureTime || !details.pickup || !details.destination) {
        return res.status(400).json({ error: "Champs obligatoires manquants pour la demande de devis" });
      }

      const db = await readDB();
      const quoteId = "qte_" + Math.random().toString(36).substr(2, 9);
      const newQuote: Quote = {
        id: quoteId,
        userId: user.id,
        vehicleId,
        details: {
          departureDate: details.departureDate,
          departureTime: details.departureTime,
          pickup: details.pickup,
          destination: details.destination,
          durationHours: parseInt(details.durationHours, 10) || 4,
          guests: parseInt(details.guests, 10) || 1,
          specificNeeds: details.specificNeeds || ""
        },
        adminPrice: null,
        status: "pending",
        createdAt: new Date().toISOString()
      };

      db.quotes.push(newQuote);
      await writeDB(db);

      return res.status(201).json({
        success: true,
        message: { fr: "Demande de devis enregistrée. Nos équipes étudient votre dossier.", en: "Quote demand sent. Our desk is reviewing it." },
        quote: newQuote
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // Get Quote details or list
  app.get("/api/quotes", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const db = await readDB();

      let quotesList = [];
      if (user.role === "admin") {
        quotesList = db.quotes;
      } else {
        quotesList = db.quotes.filter(q => q.userId === user.id);
      }

      // Populate client details for admin UI
      const mapped = quotesList.map(q => {
        const client = db.users.find(u => u.id === q.userId);
        return {
          ...q,
          clientName: client ? client.name : "Client",
          clientEmail: client ? client.email : "",
          clientPhone: client ? client.phone : ""
        };
      });

      return res.json({ quotes: mapped });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/quotes/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const db = await readDB();

      const quote = db.quotes.find(q => q.id === id);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }

      // Check access
      if (user.role !== "admin" && quote.userId !== user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const client = db.users.find(u => u.id === quote.userId);
      return res.json({
        quote: {
          ...quote,
          clientName: client ? client.name : "Client",
          clientEmail: client ? client.email : "",
          clientPhone: client ? client.phone : ""
        }
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // Admin assigns price to Quote (Task 3 "L'admin saisit le prix dans le back-office")
  app.post("/api/quotes/:id/price", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Access denied. Admin only." });
      }

      const { id } = req.params;
      const { adminPrice } = req.body;

      if (!adminPrice || isNaN(adminPrice)) {
        return res.status(400).json({ error: "Veuillez fournir un prix valide." });
      }

      const db = await readDB();
      const quoteIndex = db.quotes.findIndex(q => q.id === id);
      if (quoteIndex === -1) {
        return res.status(404).json({ error: "Quote not found" });
      }

      db.quotes[quoteIndex].adminPrice = Math.ceil(adminPrice / 500) * 500; // standard rounding for consistency
      db.quotes[quoteIndex].status = "sent";
      await writeDB(db);

      return res.json({
        success: true,
        message: "Prix du devis envoyé avec succès au client.",
        quote: db.quotes[quoteIndex]
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // Client accepts Quote (Task 3 "Si Accepté → crée une réservation normale")
  app.post("/api/quotes/:id/accept", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const { id } = req.params;

      const db = await readDB();
      const quoteIndex = db.quotes.findIndex(q => q.id === id);
      
      if (quoteIndex === -1) {
        return res.status(404).json({ error: "Devis introuvable" });
      }

      const quote = db.quotes[quoteIndex];
      if (quote.userId !== user.id && user.role !== "admin") {
        return res.status(403).json({ error: "Action non autorisée" });
      }

      if (quote.status !== "sent") {
        return res.status(400).json({ error: "Ce devis ne peut pas être accepté (aucun prix fixé par l'administrateur ou statut incorrect)." });
      }

      // Mark quote accepted
      db.quotes[quoteIndex].status = "accepted";

      // Create reservation from Quote
      const reservationId = "res_" + Math.random().toString(36).substr(2, 9);
      const newReservation: Reservation = {
        id: reservationId,
        userId: quote.userId,
        driverId: null, // SUV Prestige N3 -> premium segment -> manual driver assignment
        vehicleId: quote.vehicleId, // SUV Prestige N3
        departureDate: quote.details.departureDate,
        departureTime: quote.details.departureTime,
        pickup: quote.details.pickup,
        destination: quote.details.destination,
        formula: "hourly", // standard devis default formula
        totalPrice: quote.adminPrice || 0,
        status: "pending_assignment", // manual scheduling
        segment: "premium", // prestige is always premium
        options: quote.details.specificNeeds ? ["besoins_specifiques"] : [],
        createdAt: new Date().toISOString()
      };

      db.reservations.push(newReservation);
      await writeDB(db);

      return res.json({
        success: true,
        message: "Devis accepté et transformé en réservation confirmed. En attente d'affectation de chauffeur.",
        reservation: newReservation
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // Client refuses Quote
  app.post("/api/quotes/:id/refuse", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const { id } = req.params;

      const db = await readDB();
      const quoteIndex = db.quotes.findIndex(q => q.id === id);

      if (quoteIndex === -1) {
        return res.status(404).json({ error: "Devis introuvable" });
      }

      const quote = db.quotes[quoteIndex];
      if (quote.userId !== user.id && user.role !== "admin") {
        return res.status(403).json({ error: "Action non autorisée" });
      }

      db.quotes[quoteIndex].status = "refused";
      await writeDB(db);

      return res.json({
        success: true,
        message: "Devis décliné avec succès.",
        quote: db.quotes[quoteIndex]
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // ==========================================
  // VITE DEVELOPMENT OR STATIC ASSETS
  // ==========================================

  const httpServer = createHttpServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT"]
    }
  });

  // Store in global so REST endpoints can emit events
  (global as any).ioInstance = io;

  // Socket.io handlers
  io.on("connection", (socket) => {
    console.log("[Socket] New real-time subscriber connected:", socket.id);

    // Client/driver joins a tracking room
    socket.on("join", (reservationId: string) => {
      socket.join(`room_${reservationId}`);
      console.log(`[Socket] Client ${socket.id} joined channel for reservation ${reservationId}`);
    });

    // Driver broadcasts state locations
    socket.on("driver:location", async (data: { reservationId: string; driverId: string | null; lat: number; lng: number; heading?: number }) => {
      const { reservationId, driverId, lat, lng, heading } = data;
      if (reservationId && lat !== undefined && lng !== undefined) {
        const db = await readDB();
        const locId = "loc_" + Math.random().toString(36).substr(2, 9);
        const newLoc = {
          id: locId,
          reservationId,
          driverId,
          lat,
          lng,
          heading,
          timestamp: new Date().toISOString()
        };
        
        if (!db.trip_locations) db.trip_locations = [];
        db.trip_locations.push(newLoc);
        await writeDB(db);

        // Broadcast to everyone in the room
        io.to(`room_${reservationId}`).emit("driver:location", {
          reservationId,
          lat,
          lng,
          heading,
          timestamp: newLoc.timestamp
        });
      }
    });

    // Driver changes trip status of ongoing ride
    socket.on("trip:status_update", async (data: { reservationId: string; status: string }) => {
      const { reservationId, status } = data;
      if (reservationId && status) {
        const db = await readDB();
        const idx = db.reservations.findIndex(r => r.id === reservationId);
        if (idx !== -1) {
          const prevStatus = db.reservations[idx].status;
          db.reservations[idx].status = status as any;

          // set driver's availability if completed or cancelled
          const driverId = db.reservations[idx].driverId;
          if (driverId && (status === "completed" || status === "cancelled")) {
            const drvIdx = db.drivers.findIndex(d => d.id === driverId);
            if (drvIdx !== -1) {
              db.drivers[drvIdx].status = "disponible";
              db.drivers[drvIdx].availability = "disponible";
            }
          } else if (driverId) {
            const drvIdx = db.drivers.findIndex(d => d.id === driverId);
            if (drvIdx !== -1) {
              db.drivers[drvIdx].status = "en_mission";
              db.drivers[drvIdx].availability = "en_mission";
            }
          }

          await writeDB(db);

          io.to(`room_${reservationId}`).emit("trip:status_update", {
            reservationId,
            status,
            prevStatus
          });
        }
      }
    });

    socket.on("disconnect", () => {
      console.log("[Socket] Session closed:", socket.id);
    });
  });

  // ==========================================
  // SPRINT 5 — PARTNER & CORPORATE ENDPOINTS
  // ==========================================

  // GET invoice PDF
  app.get("/api/invoices/:id/pdf", async (req, res) => {
    try {
      const { id } = req.params;
      const db = await readDB();
      const invoice = db.invoices.find(i => i.id === id);
      if (!invoice) {
        return res.status(404).send("Facture introuvable");
      }

      // Find partner or user
      let partnerName = "Partenaire Corporate";
      let partnerEmail = "contact@partenaire.ci";
      let isPart = false;

      if (invoice.partnerId) {
        const partner = db.partners.find(p => p.id === invoice.partnerId);
        if (partner) {
          const user = db.users.find(u => u.id === partner.userId);
          partnerName = partner.companyName;
          partnerEmail = user ? user.email : "contact@partner.ci";
          isPart = true;
        }
      } else if (invoice.corporateId) {
        const user = db.users.find(u => u.id === invoice.corporateId);
        if (user) {
          partnerName = user.name + " (Corporate)";
          partnerEmail = user.email;
        }
      }

      // Find reservations of the month-year
      const resByMonth = db.reservations.filter(r => {
        const d = new Date(r.departureDate);
        const rMonth = d.getMonth() + 1;
        const rYear = d.getFullYear();
        const matchesUser = invoice.partnerId 
          ? db.partners.find(p => p.id === invoice.partnerId)?.userId === r.userId
          : invoice.corporateId === r.userId;
        return matchesUser && rMonth === invoice.month && rYear === invoice.year;
      });

      const currency = invoice.currency || "FCFA";
      let symbol = "FCFA";
      let rate = 1.0;
      if (currency === "EUR") {
        symbol = "EUR";
        rate = 1 / 655.957;
      } else if (currency === "USD") {
        symbol = "USD";
        rate = 1 / 600;
      }

      const formatPrice = (valNum: number) => {
        const converted = Math.round(valNum * rate);
        if (currency === "FCFA") {
          return converted.toLocaleString("fr-FR") + " FCFA";
        } else {
          return symbol + " " + converted.toLocaleString("en-US");
        }
      };

      const doc = new PDFDocument({ margin: 50 });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=Facture_${id}_${invoice.month}_${invoice.year}.pdf`);
      doc.pipe(res);

      // PDF DESIGN
      doc.rect(0, 0, 612, 120).fill("#0B0B10");
      doc.fillColor("#C5A880").font("Helvetica-Bold").fontSize(20).text("EV PREMIUM ABIDJAN", 50, 40);
      doc.fillColor("#A9A9B2").font("Helvetica").fontSize(10).text("L'excellence electrique a Abidjan", 50, 65);

      doc.fillColor("#C5A880").font("Helvetica-Bold").fontSize(18).text(`FACTURE N. ${id}`, 350, 40, { align: "right" });
      doc.fillColor("#A9A9B2").font("Helvetica").fontSize(10).text(`Periode: ${String(invoice.month).padStart(2, '0')}/${invoice.year}`, 350, 65, { align: "right" });

      doc.y = 150;
      doc.fillColor("#111115").font("Helvetica-Bold").fontSize(11).text("Emetteur:", 50, 150);
      doc.fillColor("#33333C").font("Helvetica").fontSize(10)
         .text("EV Premium Abidjan S.A.", 50, 165)
         .text("Zone 4, Boulevard de Marseille", 50, 180)
         .text("Abidjan, Cote-d'Ivoire", 50, 195)
         .text("Regie : billing@easy.ci", 50, 210);

      doc.fillColor("#111115").font("Helvetica-Bold").fontSize(11).text("Client / Partenaire:", 330, 150);
      doc.fillColor("#33333C").font("Helvetica").fontSize(10)
         .text(partnerName, 330, 165)
         .text(partnerEmail, 330, 180)
         .text("Contrat Premium Active", 330, 195);

      doc.moveTo(50, 240).lineTo(562, 240).strokeColor("#E0E0EB").stroke();

      doc.y = 260;
      doc.fillColor("#111115").font("Helvetica-Bold").fontSize(12).text("Detail des courses du mois", 50, 260);

      let currentY = 285;
      doc.rect(50, currentY, 512, 20).fill("#F4F4F9");
      doc.fillColor("#55555F").font("Helvetica-Bold").fontSize(9)
         .text("Date", 55, currentY + 5)
         .text("Trajet", 120, currentY + 5)
         .text("Vehicule", 340, currentY + 5)
         .text("Montant", 470, currentY + 5, { width: 85, align: "right" });

      currentY += 20;

      doc.font("Helvetica").fontSize(8).fillColor("#33333C");
      if (resByMonth.length === 0) {
        doc.text("Courses forfaitaires consolidees du mois", 120, currentY + 5);
        doc.text(formatPrice(invoice.totalAmount), 470, currentY + 5, { width: 85, align: "right" });
        currentY += 20;
      } else {
        resByMonth.forEach((r) => {
          doc.moveTo(50, currentY + 16).lineTo(562, currentY + 16).strokeColor("#ECECEF").stroke();
          const title = `${r.pickup.split(',')[0]} -> ${r.destination.split(',')[0]}`;
          doc.text(r.departureDate, 55, currentY + 4);
          doc.text(title.substring(0, 45), 120, currentY + 4);
          doc.text(r.vehicleId.replace("v_", "").toUpperCase(), 340, currentY + 4);
          doc.text(formatPrice(r.totalPrice), 470, currentY + 4, { width: 85, align: "right" });
          currentY += 18;
        });
      }

      currentY += 10;
      doc.moveTo(50, currentY).lineTo(562, currentY).strokeColor("#A9A9B2").stroke();
      currentY += 10;

      doc.font("Helvetica").fontSize(10);
      doc.text("Sous-total des courses:", 300, currentY);
      doc.text(formatPrice(invoice.totalAmount), 470, currentY, { width: 85, align: "right" });
      
      currentY += 18;
      if (isPart) {
        doc.text(`Commission deduite (${invoice.commissionAmount ? Math.round((invoice.commissionAmount/invoice.totalAmount)*100) : 12}%):`, 300, currentY);
        doc.text(`- ${formatPrice(invoice.commissionAmount)}`, 470, currentY, { width: 85, align: "right" });
        currentY += 18;
      }

      doc.rect(300, currentY - 4, 262, 22).fill("#0B0B10");
      doc.fillColor("#C5A880").font("Helvetica-Bold").fontSize(10);
      const finalPayable = invoice.totalAmount - (isPart ? invoice.commissionAmount : 0);
      doc.text("Montant net a regler:", 310, currentY + 2);
      doc.text(formatPrice(finalPayable), 470, currentY + 2, { width: 85, align: "right" });

      currentY += 40;

      doc.fillColor("#111115").font("Helvetica-Bold").fontSize(9).text("Instructions de Reglement:", 50, currentY);
      doc.fillColor("#55555F").font("Helvetica").fontSize(8)
         .text("Virement bancaire sous 15 jours sur le compte :", 50, currentY + 15)
         .text("SIB Cote d'Ivoire - IBAN CI76 0100 1204 8839 2004 12", 50, currentY + 28)
         .text("Reference a indiquer obligatoirement : EV-PREM-" + id, 50, currentY + 41);

      doc.end();

    } catch (e: any) {
      console.error("[PDF generation error]:", e);
      if (!res.headersSent) {
        res.status(500).send("Erreur lors de la generation du document PDF.");
      }
    }
  });

  // GET PARTNER PROFILE & KPIs (Task 1)
  app.get("/api/partner/dashboard", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user.role !== "partenaire") {
        return res.status(403).json({ error: "Reserve aux partenaires." });
      }

      const db = await readDB();

      let partner = db.partners.find(p => p.userId === user.id);
      if (!partner) {
        partner = {
          id: "part_" + Math.random().toString(36).substr(2, 9),
          userId: user.id,
          companyName: user.name + " S.A.R.L.",
          commissionRate: 12,
          contractStart: new Date().toISOString().split("T")[0],
          contractEnd: "2030-12-31",
          createdAt: new Date().toISOString()
        };
        db.partners.push(partner);
        await writeDB(db);
      }

      const partnerInvoices = db.invoices.filter(i => i.partnerId === partner.id);

      const partnerReservations = db.reservations.filter(r => r.userId === user.id);

      const totalCoursesAmount = partnerReservations
        .filter(r => r.status !== "cancelled" && r.dispositionConfirmed === true)
        .reduce((sum, r) => sum + r.totalPrice, 0);

      const commissionRate = partner.commissionRate;
      const totalCommission = Math.round(totalCoursesAmount * (commissionRate / 100));

      const pendingInvoicesCount = db.invoices.filter(i => i.partnerId === partner.id && i.status === "En attente de règlement").length;

      const currentMonthReservations = partnerReservations.filter(r => {
        const d = new Date(r.departureDate);
        const isJune2026 = d.getMonth() + 1 === 6 && d.getFullYear() === 2026;
        const isActiveOrFuture = r.status !== "completed" && r.status !== "cancelled" && r.status !== "Payée";
        return isJune2026 || isActiveOrFuture;
      });

      return res.json({
        partner,
        kpis: {
          bookingCount: partnerReservations.length,
          totalRevenue: totalCoursesAmount,
          commissionAmount: totalCommission,
          pendingInvoices: pendingInvoicesCount
        },
        currentMonthReservations,
        allReservations: partnerReservations,
        invoices: db.invoices.filter(i => i.partnerId === partner.id),
        vehicleClasses: db.vehicles
      });

    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // POST PARTNER RESERVATION (Task 2)
  app.post("/api/partner/reservations", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user.role !== "partenaire") {
        return res.status(403).json({ error: "Acces partenaire requis." });
      }

      const {
        vehicleId,
        departureDate,
        departureTime,
        pickup,
        destination,
        formula,
        durationHours,
        options,
        totalPrice,
        clientName,
        clientPhone,
        specialInstructions
      } = req.body;

      if (!vehicleId || !departureDate || !departureTime || !pickup || !destination || !formula || !clientName || !clientPhone) {
        return res.status(400).json({ error: { fr: "Champs obligatoires manquants", en: "Missing required fields" } });
      }

      const db = await readDB();

      const reservationId = "res_" + Math.random().toString(36).substr(2, 9);
      const newReservation: any = {
        id: reservationId,
        userId: user.id,
        driverId: null,
        vehicleId,
        departureDate,
        departureTime,
        pickup,
        destination,
        formula,
        totalPrice,
        status: "À facturer",
        segment: "premium",
        options: options || [],
        clientName,
        clientPhone,
        specialInstructions: specialInstructions || "",
        createdAt: new Date().toISOString()
      };

      const availableDrivers = db.drivers.filter(d => d.status === "disponible");
      if (availableDrivers.length > 0) {
        newReservation.driverId = availableDrivers[0].id;
      } else if (db.drivers.length > 0) {
        newReservation.driverId = db.drivers[0].id;
      } else {
        newReservation.driverId = null;
      }

      db.reservations.push(newReservation);

      const partner = db.partners.find(p => p.userId === user.id);
      if (partner) {
        const juneInvoice = db.invoices.find(i => i.partnerId === partner.id && i.month === 6 && i.year === 2026);
        if (juneInvoice) {
          juneInvoice.totalAmount += totalPrice;
          juneInvoice.commissionAmount = Math.round(juneInvoice.totalAmount * (partner.commissionRate / 100));
        }
      }

      await writeDB(db);
      console.log(`[SIMULATED EMAIL] Sent confirmation to partner: ${user.email} for final client ${clientName}`);

      return res.status(201).json({
        message: { fr: "Reservation partenaire enregistree (A facturer)", en: "Partner reservation recorded (To invoice)" },
        reservation: newReservation,
        emailSimulated: true
      });

    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET CORPORATE PROFILE & KPIs (Task 5)
  app.get("/api/corporate/dashboard", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user.role !== "corporate" && user.role !== "admin") {
        return res.status(403).json({ error: "Reserve aux comptes Corporate." });
      }

      const db = await readDB();

      const corpInvoices = db.invoices.filter(i => i.corporateId === user.id);

      const corpReservations = db.reservations.filter(r => r.userId === user.id);

      const totalSpent = corpReservations
        .filter(r => r.status !== "cancelled")
        .reduce((sum, r) => sum + r.totalPrice, 0);

      const pendingInvoicesCount = db.invoices.filter(i => i.corporateId === user.id && i.status === "En attente de règlement").length;

      return res.json({
        kpis: {
          bookingCount: corpReservations.length,
          totalSpent,
          pendingInvoices: pendingInvoicesCount
        },
        reservations: corpReservations,
        invoices: db.invoices.filter(i => i.corporateId === user.id),
        vehicles: db.vehicles
      });

    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // POST CORPORATE RESERVATION (Task 5)
  app.post("/api/corporate/reservations", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user.role !== "corporate") {
        return res.status(403).json({ error: "Reserve aux comptes Corporate." });
      }

      const {
        vehicleId,
        departureDate,
        departureTime,
        pickup,
        destination,
        formula,
        durationHours,
        options,
        totalPrice,
        clientName,
        specialInstructions,
        currency
      } = req.body;

      if (!vehicleId || !departureDate || !departureTime || !pickup || !destination || !formula) {
        return res.status(400).json({ error: { fr: "Champs obligatoires manquants", en: "Missing parameters" } });
      }

      const db = await readDB();

      const reservationId = "res_" + Math.random().toString(36).substr(2, 9);
      const newReservation: any = {
        id: reservationId,
        userId: user.id,
        driverId: null,
        vehicleId,
        departureDate,
        departureTime,
        pickup,
        destination,
        formula,
        totalPrice,
        status: "À facturer",
        segment: "premium",
        options: options || [],
        clientName: clientName || user.name,
        specialInstructions: specialInstructions || "",
        currency: currency || "FCFA",
        createdAt: new Date().toISOString()
      };

      const availableDrivers = db.drivers.filter(d => d.status === "disponible");
      if (availableDrivers.length > 0) {
        newReservation.driverId = availableDrivers[0].id;
      } else if (db.drivers.length > 0) {
        newReservation.driverId = db.drivers[0].id;
      } else {
        newReservation.driverId = null;
      }

      db.reservations.push(newReservation);

      const juneCorpInvoice = db.invoices.find(i => i.corporateId === user.id && i.month === 6 && i.year === 2026);
      if (juneCorpInvoice) {
        juneCorpInvoice.totalAmount += totalPrice;
      }

      await writeDB(db);

      return res.status(201).json({
        message: { fr: "Reservation corporate enregistree (A facturer)", en: "Corporate reservation registered" },
        reservation: newReservation
      });

    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // MARK INVOICE AS PAID (Test helper)
  app.post("/api/invoices/:id/pay", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const db = await readDB();
      const invoiceIndex = db.invoices.findIndex(i => i.id === id);
      if (invoiceIndex === -1) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      db.invoices[invoiceIndex].status = "Réglée";
      await writeDB(db);
      return res.json({ message: "Invoice marked as paid", invoice: db.invoices[invoiceIndex] });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // ADMIN CONTROL ENDPOINTS
  // ==========================================

  function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
    requireAuth(req, res, () => {
      const user = (req as any).user;
      if (user && user.role === "admin") {
        next();
      } else {
        res.status(403).json({ error: { fr: "Accès refusé. Administrateur requis.", en: "Access denied. Admin required." } });
      }
    });
  }

  // 1. Dashboard statistics
  app.get("/api/admin/dashboard", requireAdmin, async (req, res) => {
    try {
      const db = await readDB();
      const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const rawCurrentMonth = new Date().getMonth() + 1;
      const rawCurrentYear = new Date().getFullYear();

      // Today's reservations
      const todayReservations = db.reservations.filter(r => r.departureDate === todayStr);
      const activeReservationsCount = todayReservations.length;

      // Revenus du jour (excluding cancelled)
      const dailyRevenuesObj = todayReservations
        .filter(r => r.status !== "cancelled")
        .reduce((sum, r) => sum + (r.totalPrice || 0), 0);

      // Revenus du mois (current month/year)
      const monthlyReservations = db.reservations.filter(r => {
        try {
          const dateParts = r.departureDate.split("-");
          const year = parseInt(dateParts[0]);
          const month = parseInt(dateParts[1]);
          return year === rawCurrentYear && month === rawCurrentMonth && r.status !== "cancelled";
        } catch (_) {
          return false;
        }
      });
      const monthlyRevenues = monthlyReservations.reduce((sum, r) => sum + (r.totalPrice || 0), 0);

      // Vehicles states
      const totalVehiclesStr = db.vehicles.length;
      const avVehicles = db.vehicles.filter(v => v.status === "Disponible").length;
      const maintVehicles = db.vehicles.filter(v => v.status === "Indisponible").length;
      const missionVehiclesVal = totalVehiclesStr - avVehicles - maintVehicles;

      // Chauffeurs
      const activeDrivers = db.drivers.length;
      const connectedDrivers = db.drivers.filter(d => d.status === "disponible" || d.status === "en_mission").length;

      // Pending reservations
      const pendingReservations = db.reservations.filter((r: any) => r.status === "pending_assignment" || r.status === "pending" || r.status === "À facturer");

      // Invoices summaries
      const totalInvoices = db.invoices || [];

      res.json({
        stats: {
          todayTripsCount: activeReservationsCount,
          todayRevenue: dailyRevenuesObj,
          monthlyRevenue: monthlyRevenues,
          vehiclesAvailable: avVehicles,
          vehiclesInMission: missionVehiclesVal,
          vehiclesMaintenance: maintVehicles,
          connectedDrivers,
          pendingBookingsCount: pendingReservations.length
        },
        pendingReservations: pendingReservations.slice(0, 10),
        recentInvoices: totalInvoices.slice(-10),
        recentQuotes: (db.quotes || []).slice(-10),
        allReservations: db.reservations || []
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Vehicles CRUD
  app.get("/api/admin/vehicles", requireAdmin, async (req, res) => {
    const db = await readDB();
    res.json(db.vehicles || []);
  });

  app.post("/api/admin/vehicles", requireAdmin, async (req, res) => {
    try {
      const { 
        brand, 
        name, 
        category, 
        immatriculation, 
        batteryLevel, 
        status,
        photoFront,
        photoBack,
        photoLeft,
        photoRight,
        maxSpeed,
        fuelConsumption,
        totalDistance
      } = req.body;
      if (!name || !category || !immatriculation) {
        return res.status(400).json({ error: "Champs obligatoires manquants" });
      }
      const db = await readDB();
      
      // Beautiful default luxury car pictures from Unsplash
      const defaultFront = category === "suv-executive" || category === "suv-prestige"
        ? "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=600"
        : "https://images.unsplash.com/photo-1555215695-3004980ad54e?q=80&w=600";
      const defaultBack = "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?q=80&w=600";
      const defaultLeft = "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=600";
      const defaultRight = "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?q=80&w=600";

      const newVehicle: Vehicle = {
        id: "v_" + Math.random().toString(36).substr(2, 9),
        brand: brand || "EASY",
        name,
        category,
        immatriculation,
        batteryLevel: batteryLevel !== undefined ? parseInt(batteryLevel) : 100,
        status: status || "Disponible",
        photoFront: photoFront || defaultFront,
        photoBack: photoBack || defaultBack,
        photoLeft: photoLeft || defaultLeft,
        photoRight: photoRight || defaultRight,
        maxSpeed: maxSpeed ? parseInt(maxSpeed) : 220,
        fuelConsumption: fuelConsumption || "16.8 kWh/100km",
        totalDistance: totalDistance || "12,450 km"
      };
      db.vehicles.push(newVehicle);
      await writeDB(db);
      res.status(201).json(newVehicle);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/admin/vehicles/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        brand, 
        name, 
        category, 
        immatriculation, 
        batteryLevel, 
        status,
        photoFront,
        photoBack,
        photoLeft,
        photoRight,
        maxSpeed,
        fuelConsumption,
        totalDistance
      } = req.body;
      const db = await readDB();
      const vehicleIndex = db.vehicles.findIndex(v => v.id === id);
      if (vehicleIndex === -1) {
        return res.status(404).json({ error: "Véhicule non trouvé" });
      }
      db.vehicles[vehicleIndex] = {
        ...db.vehicles[vehicleIndex],
        brand: brand || db.vehicles[vehicleIndex].brand,
        name: name || db.vehicles[vehicleIndex].name,
        category: category || db.vehicles[vehicleIndex].category,
        immatriculation: immatriculation || db.vehicles[vehicleIndex].immatriculation,
        batteryLevel: batteryLevel !== undefined ? parseInt(batteryLevel) : db.vehicles[vehicleIndex].batteryLevel,
        status: status || db.vehicles[vehicleIndex].status,
        photoFront: photoFront !== undefined ? photoFront : db.vehicles[vehicleIndex].photoFront,
        photoBack: photoBack !== undefined ? photoBack : db.vehicles[vehicleIndex].photoBack,
        photoLeft: photoLeft !== undefined ? photoLeft : db.vehicles[vehicleIndex].photoLeft,
        photoRight: photoRight !== undefined ? photoRight : db.vehicles[vehicleIndex].photoRight,
        maxSpeed: maxSpeed !== undefined ? parseInt(maxSpeed) : db.vehicles[vehicleIndex].maxSpeed,
        fuelConsumption: fuelConsumption !== undefined ? fuelConsumption : db.vehicles[vehicleIndex].fuelConsumption,
        totalDistance: totalDistance !== undefined ? totalDistance : db.vehicles[vehicleIndex].totalDistance
      };
      await writeDB(db);
      res.json(db.vehicles[vehicleIndex]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admin/vehicles/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const db = await readDB();
      db.vehicles = db.vehicles.filter(v => v.id !== id);
      await writeDB(db);
      res.json({ message: "Véhicule supprimé avec succès." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Drivers CRUD
  app.get("/api/admin/drivers", requireAdmin, async (req, res) => {
    const db = await readDB();
    res.json(db.drivers || []);
  });

  app.post("/api/admin/drivers", requireAdmin, async (req, res) => {
    try {
      const { name, phone, email, photo, status, vehicleId, shift } = req.body;
      if (!name || !email || !phone) {
        return res.status(400).json({ error: "Informations obligatoires manquantes" });
      }
      const db = await readDB();
      
      if (vehicleId) {
        const assignedDriversCount = (db.drivers || []).filter((d: any) => d.vehicleId === vehicleId).length;
        if (assignedDriversCount >= 2) {
          return res.status(400).json({ error: "Ce véhicule a déjà atteint le nombre maximum de chauffeurs (au plus 2 chauffeurs)." });
        }
      }

      let userObj = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!userObj) {
        const userId = "usr_" + Math.random().toString(36).substr(2, 9);
        const passHash = await bcrypt.hash("password", 10);
        userObj = {
          id: userId,
          name,
          email,
          phone,
          passwordHash: passHash,
          role: "chauffeur",
          createdAt: new Date().toISOString()
        };
        db.users.push(userObj);
      }

      const newDriver: Driver = {
        id: "drv_" + Math.random().toString(36).substr(2, 9),
        userId: userObj.id,
        name,
        phone,
        email,
        photo: photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256",
        status: status || "disponible",
        availability: status || "disponible",
        rating: 5.0,
        vehicleId: vehicleId || "",
        shift: shift || "matin",
        createdAt: new Date().toISOString()
      };
      db.drivers.push(newDriver);
      await writeDB(db);
      res.status(201).json(newDriver);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/admin/drivers/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, phone, email, photo, status, rating, vehicleId, shift } = req.body;
      const db = await readDB();
      const driverIndex = db.drivers.findIndex(d => d.id === id);
      if (driverIndex === -1) {
        return res.status(404).json({ error: "Chauffeur non trouvé" });
      }
      
      if (vehicleId) {
        const assignedDriversCount = (db.drivers || []).filter((d: any) => d.id !== id && d.vehicleId === vehicleId).length;
        if (assignedDriversCount >= 2) {
          return res.status(400).json({ error: "Ce véhicule a déjà atteint le nombre maximum de chauffeurs (au plus 2 chauffeurs)." });
        }
      }
      
      const prevDriver = db.drivers[driverIndex];
      const updated: Driver = {
        ...prevDriver,
        name: name || prevDriver.name,
        phone: phone || prevDriver.phone,
        email: email || prevDriver.email,
        photo: photo || prevDriver.photo,
        status: status || prevDriver.status,
        availability: status || prevDriver.availability,
        rating: rating !== undefined ? parseFloat(rating) : prevDriver.rating,
        vehicleId: vehicleId !== undefined ? vehicleId : prevDriver.vehicleId,
        shift: shift !== undefined ? shift : prevDriver.shift
      };
      db.drivers[driverIndex] = updated;

      if (prevDriver.userId) {
        const uIndex = db.users.findIndex(u => u.id === prevDriver.userId);
        if (uIndex !== -1) {
          db.users[uIndex] = {
            ...db.users[uIndex],
            name: updated.name,
            phone: updated.phone,
            email: updated.email
          };
        }
      }

      await writeDB(db);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admin/drivers/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const db = await readDB();
      const driver = db.drivers.find(d => d.id === id);
      if (!driver) {
        return res.status(404).json({ error: "Chauffeur non trouvé" });
      }
      db.drivers = db.drivers.filter(d => d.id !== id);
      if (driver.userId) {
        db.users = db.users.filter(u => u.id !== driver.userId);
      }
      await writeDB(db);
      res.json({ message: "Chauffeur supprimé." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Reservations CRUD
  app.get("/api/admin/reservations", requireAdmin, async (req, res) => {
    const db = await readDB();
    const populated = (db.reservations || []).map(r => {
      const user = db.users.find(u => u.id === r.userId);
      return {
        ...r,
        clientName: user ? user.name : "Inconnu",
        clientEmail: user ? user.email : "Inconnu",
        clientPhone: user ? user.phone : "Inconnu"
      };
    });
    res.json(populated);
  });

  app.post("/api/admin/reservations", requireAdmin, async (req, res) => {
    try {
      const { userId, vehicleId, driverId, departureDate, departureTime, pickup, destination, formula, totalPrice, status } = req.body;
      const db = await readDB();
      const newReservation: Reservation = {
        id: "res_" + Math.random().toString(36).substr(2, 9),
        userId: userId || "usr_anonymous",
        driverId: driverId || null,
        vehicleId: vehicleId || "v_berline_n1",
        departureDate,
        departureTime,
        pickup,
        destination,
        formula: formula || "hourly",
        totalPrice: totalPrice !== undefined ? parseFloat(totalPrice) : 30000,
        status: status || "pending_assignment",
        segment: "premium",
        options: [],
        createdAt: new Date().toISOString()
      };
      db.reservations.push(newReservation);
      await writeDB(db);
      res.status(201).json(newReservation);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/admin/reservations/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { departureDate, departureTime, pickup, destination, status, driverId, vehicleId, totalPrice, formula, dispositionConfirmed } = req.body;
      const db = await readDB();
      const resIndex = db.reservations.findIndex(r => r.id === id);
      if (resIndex === -1) {
        return res.status(404).json({ error: "Réservation non trouvée" });
      }

      const targetDriverId = driverId !== undefined ? driverId : db.reservations[resIndex].driverId;
      let finalVehicleId = vehicleId || db.reservations[resIndex].vehicleId;
      
      if (targetDriverId) {
        const selectedDriver = db.drivers.find(d => d.id === targetDriverId);
        if (selectedDriver && selectedDriver.vehicleId) {
          finalVehicleId = selectedDriver.vehicleId;
        }
      }

      db.reservations[resIndex] = {
        ...db.reservations[resIndex],
        departureDate: departureDate || db.reservations[resIndex].departureDate,
        departureTime: departureTime || db.reservations[resIndex].departureTime,
        pickup: pickup || db.reservations[resIndex].pickup,
        destination: destination || db.reservations[resIndex].destination,
        status: status || db.reservations[resIndex].status,
        driverId: targetDriverId,
        vehicleId: finalVehicleId,
        totalPrice: totalPrice !== undefined ? parseFloat(totalPrice) : db.reservations[resIndex].totalPrice,
        formula: formula || db.reservations[resIndex].formula,
        dispositionConfirmed: dispositionConfirmed !== undefined ? dispositionConfirmed : db.reservations[resIndex].dispositionConfirmed
      };

      // Auto-generate or update monthly invoice for the corresponding partner
      const updatedRes = db.reservations[resIndex];
      const partner = db.partners.find(p => p.userId === updatedRes.userId);
      if (partner) {
        try {
          const dateParts = updatedRes.departureDate.split("-");
          const year = parseInt(dateParts[0]);
          const month = parseInt(dateParts[1]);
          
          if (!isNaN(year) && !isNaN(month)) {
            const partnerReservationsInMonth = db.reservations.filter(r => {
              if (r.userId !== partner.userId || r.status === "cancelled" || r.dispositionConfirmed !== true) {
                return false;
              }
              try {
                const dParts = r.departureDate.split("-");
                const rY = parseInt(dParts[0]);
                const rM = parseInt(dParts[1]);
                return rY === year && rM === month;
              } catch (_) {
                return false;
              }
            });

            const totalAmount = partnerReservationsInMonth.reduce((sum, r) => sum + (r.totalPrice || 0), 0);
            const commissionAmount = Math.round(totalAmount * (partner.commissionRate / 100));

            const existingInvoiceIndex = db.invoices.findIndex(inv => 
              inv.partnerId === partner.id && 
              inv.month === month && 
              inv.year === year
            );

            if (totalAmount > 0) {
              if (existingInvoiceIndex !== -1) {
                db.invoices[existingInvoiceIndex].totalAmount = totalAmount;
                db.invoices[existingInvoiceIndex].commissionAmount = commissionAmount;
              } else {
                const invoiceId = `INV-${partner.id.substring(0, 5).toUpperCase()}-${year}-${String(month).padStart(2, '0')}`;
                const newInvoice: Invoice = {
                  id: invoiceId,
                  partnerId: partner.id,
                  corporateId: null,
                  month: month,
                  year: year,
                  totalAmount: totalAmount,
                  commissionAmount: commissionAmount,
                  status: "En attente de règlement",
                  pdfUrl: `/api/invoices/${invoiceId}/pdf`,
                  createdAt: new Date().toISOString()
                };
                db.invoices.push(newInvoice);
              }
            } else {
              if (existingInvoiceIndex !== -1) {
                db.invoices.splice(existingInvoiceIndex, 1);
              }
            }
          }
        } catch (invoiceErr) {
          console.error("Error auto-updating invoice:", invoiceErr);
        }
      }
      
      await writeDB(db);
      res.json(db.reservations[resIndex]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admin/reservations/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const db = await readDB();
      db.reservations = db.reservations.filter(r => r.id !== id);
      await writeDB(db);
      res.json({ message: "Réservation supprimée." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Corporates list and settings
  app.get("/api/admin/corporates", requireAdmin, async (req, res) => {
    const db = await readDB();
    const corporates = db.users.filter(u => u.role === "corporate").map(u => {
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        createdAt: u.createdAt,
        isBlocked: (u as any).isBlocked || false,
        spendingLimit: (u as any).spendingLimit !== undefined ? (u as any).spendingLimit : 2500000,
        discountRate: (u as any).discountRate !== undefined ? (u as any).discountRate : 10,
        contractStart: (u as any).contractStart || "2026-01-01",
        contractEnd: (u as any).contractEnd || "2026-12-31",
        serviceCodes: (u as any).serviceCodes || ["Finance-VIP-03", "IT-Support-04", "HR-Core-01"]
      };
    });
    res.json(corporates);
  });

  app.put("/api/admin/corporates/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { spendingLimit, discountRate, contractStart, contractEnd, serviceCodes, isBlocked, name, email, phone } = req.body;
      const db = await readDB();
      const uIndex = db.users.findIndex(u => u.id === id);
      if (uIndex === -1) {
        return res.status(404).json({ error: "Entreprise non trouvée" });
      }

      db.users[uIndex] = {
        ...db.users[uIndex],
        name: name || db.users[uIndex].name,
        email: email || db.users[uIndex].email,
        phone: phone || db.users[uIndex].phone,
        isBlocked: isBlocked !== undefined ? isBlocked : (db.users[uIndex] as any).isBlocked,
        spendingLimit: spendingLimit !== undefined ? parseFloat(spendingLimit) : (db.users[uIndex] as any).spendingLimit,
        discountRate: discountRate !== undefined ? parseInt(discountRate) : (db.users[uIndex] as any).discountRate,
        contractStart: contractStart || (db.users[uIndex] as any).contractStart,
        contractEnd: contractEnd || (db.users[uIndex] as any).contractEnd,
        serviceCodes: serviceCodes || (db.users[uIndex] as any).serviceCodes
      } as any;

      await writeDB(db);
      res.json(db.users[uIndex]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/corporates", requireAdmin, async (req, res) => {
    try {
      const { name, email, phone, spendingLimit, discountRate, contractStart, contractEnd, serviceCodes } = req.body;
      if (!name || !email || !phone) {
        return res.status(400).json({ error: "Nom, email et téléphone requis" });
      }
      const db = await readDB();
      const emailExists = db.users.some(u => u.email.toLowerCase() === email.toLowerCase());
      if (emailExists) {
         return res.status(400).json({ error: "Cet email est déjà réservé." });
      }
      const newId = "usr_" + Math.random().toString(36).substr(2, 9);
      const hash = await bcrypt.hash("password", 10);
      const newCorp: any = {
         id: newId,
         name,
         email,
         phone,
         passwordHash: hash,
         role: "corporate",
         createdAt: new Date().toISOString(),
         isBlocked: false,
         spendingLimit: spendingLimit !== undefined ? parseFloat(spendingLimit) : 2500000,
         discountRate: discountRate !== undefined ? parseInt(discountRate) : 10,
         contractStart: contractStart || "2026-01-01",
         contractEnd: contractEnd || "2026-12-31",
         serviceCodes: serviceCodes || ["Finance-VIP-03"]
      };
      db.users.push(newCorp);
      await writeDB(db);
      res.json(newCorp);
    } catch (err: any) {
       res.status(500).json({ error: err.message });
    }
  });

  // 6. Clients List and Settings
  app.get("/api/admin/clients", requireAdmin, async (req, res) => {
    const db = await readDB();
    const clients = db.users.filter(u => u.role === "client").map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      createdAt: u.createdAt,
      isBlocked: (u as any).isBlocked || false
    }));
    res.json(clients);
  });

  app.put("/api/admin/clients/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { isBlocked, name, email, phone } = req.body;
      const db = await readDB();
      const uIndex = db.users.findIndex(u => u.id === id);
      if (uIndex === -1) {
        return res.status(404).json({ error: "Client non trouvé" });
      }
      db.users[uIndex] = {
        ...db.users[uIndex],
        name: name || db.users[uIndex].name,
        email: email || db.users[uIndex].email,
        phone: phone || db.users[uIndex].phone,
        isBlocked: isBlocked !== undefined ? isBlocked : (db.users[uIndex] as any).isBlocked
      } as any;
      await writeDB(db);
      res.json(db.users[uIndex]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6.5 Hospitality Partners Administration
  app.get("/api/admin/hospitality-partners", requireAdmin, async (req, res) => {
    try {
      const db = await readDB();
      const partners = db.users
        .filter(u => u.role === "partenaire")
        .map(u => {
          const usrAny = u as any;
          const partnerEntry = db.partners.find(p => p.userId === u.id);
          return {
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            partnerType: usrAny.partnerType,
            status: usrAny.status || "pending_validation",
            starRating: usrAny.starRating || "all",
            documents: usrAny.documents || {},
            rejectionReason: usrAny.rejectionReason || null,
            createdAt: u.createdAt,
            commissionRate: partnerEntry ? partnerEntry.commissionRate : null,
            partnerEntryId: partnerEntry ? partnerEntry.id : null
          };
        });
      res.json(partners);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/hospitality-partners/:id/approve", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { commissionRate } = req.body;
      const rate = commissionRate !== undefined ? parseInt(commissionRate) : 12;

      const db = await readDB();
      const uIndex = db.users.findIndex(u => u.id === id);
      if (uIndex === -1) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }

      const user = db.users[uIndex] as any;
      user.status = "approved";
      user.rejectionReason = null;

      // Add or update Partner Profile in db.partners
      let partner = db.partners.find(p => p.userId === id);
      if (!partner) {
        partner = {
          id: "part_" + Math.random().toString(36).substr(2, 9),
          userId: id,
          companyName: user.name,
          commissionRate: rate,
          contractStart: new Date().toISOString().split("T")[0],
          contractEnd: "2030-12-31",
          createdAt: new Date().toISOString()
        };
        db.partners.push(partner);
      } else {
        partner.commissionRate = rate;
      }

      await writeDB(db);

      // Send/simulate approval email
      const emailSubject = "Félicitations — Votre compte Partenaire EASY est activé !";
      const emailText = `Bonjour ${user.name},\n\nNous avons le plaisir de vous informer que votre compte Partenaire Hospitality a été validé avec succès par l'administrateur EASY !\n\nVous bénéficiez désormais d'un taux de commission préférentiel de ${rate}% reversé sur toutes vos réservations, ainsi que de notre service de facturation mensuelle groupée.\n\nVous pouvez maintenant vous connecter directement à votre espace de compte et commencer à enregistrer des réservations pour vos clients.\n\nLien de connexion direct : http://localhost:3000/connexion\n\nBienvenue chez EASY,\nL'équipe EASY`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #C5A880; border-radius: 8px; background-color: #0E0E14; color: #E0E0E0;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #C5A880; font-size: 24px; margin: 0;">EASY (by Saver)</h1>
            <p style="color: #8A8A9A; font-size: 12px; margin: 5px 0 0 0;">Prestige Mobile Service</p>
          </div>
          <div style="padding: 20px; background-color: #14141C; border-radius: 6px; border: 1px solid rgba(0, 200, 83, 0.2);">
            <h2 style="color: #00C853; font-size: 18px; border-bottom: 1px solid rgba(0, 200, 83, 0.2); padding-bottom: 10px; margin-top: 0;">Votre compte Partenaire est activé !</h2>
            <p style="font-size: 14px; line-height: 1.6;">Bonjour <strong>${user.name}</strong>,</p>
            <p style="font-size: 14px; line-height: 1.6;">Nous avons le plaisir de vous informer que votre compte <strong>Partenaire Hospitality (Hôtel & Résidence)</strong> a été validé avec succès par l'administrateur EASY !</p>
            
            <div style="background-color: #161F1A; border-left: 4px solid #00C853; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #00C853;">Vos Avantages Activés :</h3>
              <table style="width: 100%; font-size: 13px; color: #E0E0E0; border-collapse: collapse;">
                <tr>
                  <td style="padding: 4px 0; font-weight: bold; width: 180px;">Régime Financier :</td>
                  <td style="padding: 4px 0;">Facturation mensuelle groupée</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-weight: bold;">Taux de Commission :</td>
                  <td style="padding: 4px 0; color: #00C853; font-weight: bold;">${rate}% reversés</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-weight: bold;">Mode de Réservation :</td>
                  <td style="padding: 4px 0;">Réservation simplifiée (Catégorie + Formule + Choix de paiement)</td>
                </tr>
              </table>
            </div>

            <p style="font-size: 14px; line-height: 1.6; text-align: center; margin: 30px 0;">
              <a href="http://localhost:3000/connexion" style="background-color: #C5A880; color: #000000; font-weight: bold; text-decoration: none; padding: 12px 25px; border-radius: 6px; display: inline-block;">Accéder à mon Espace Partenaire</a>
            </p>

            <p style="font-size: 13px; color: #8A8A9A; line-height: 1.5;">Si le bouton ci-dessus ne fonctionne pas, copiez-collez l'adresse suivante dans votre navigateur :<br/>http://localhost:3000/connexion</p>
          </div>
          <div style="text-align: center; margin-top: 20px; font-size: 11px; color: #8A8A9A;">
            <p>Cet email a été envoyé automatiquement suite à la validation de votre compte.</p>
            <p>© 2026 EASY Luxury Transportation. Tous droits réservés.</p>
          </div>
        </div>
      `;
      sendRealEmail(user.email, emailSubject, emailText, emailHtml).catch(err => console.error("Simulated email send error", err));

      res.json({ success: true, user, partner });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/hospitality-partners/:id/reject", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      if (!reason) {
        return res.status(400).json({ error: "Un motif de rejet est requis." });
      }

      const db = await readDB();
      const uIndex = db.users.findIndex(u => u.id === id);
      if (uIndex === -1) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }

      const user = db.users[uIndex] as any;
      user.status = "rejected";
      user.rejectionReason = reason;

      await writeDB(db);

      // Send/simulate rejection email
      const emailSubject = "EASY — Notification concernant votre demande d'inscription";
      const emailText = `Bonjour ${user.name},\n\nNous avons le regret de vous informer que votre demande d'inscription en tant que Partenaire Hospitality a été rejetée pour le motif suivant :\n\n${reason}\n\nVous pouvez nous contacter pour toute précision ou soumettre un nouveau dossier conforme aux exigences réglementaires.\n\nL'équipe EASY`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #D32F2F; border-radius: 8px; background-color: #0E0E14; color: #E0E0E0;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #D32F2F; font-size: 24px; margin: 0;">EASY (by Saver)</h1>
            <p style="color: #8A8A9A; font-size: 12px; margin: 5px 0 0 0;">Prestige Mobile Service</p>
          </div>
          <div style="padding: 20px; background-color: #14141C; border-radius: 6px; border: 1px solid rgba(211, 47, 47, 0.2);">
            <h2 style="color: #D32F2F; font-size: 18px; border-bottom: 1px solid rgba(211, 47, 47, 0.2); padding-bottom: 10px; margin-top: 0;">Notification concernant votre inscription</h2>
            <p style="font-size: 14px; line-height: 1.6;">Bonjour <strong>${user.name}</strong>,</p>
            <p style="font-size: 14px; line-height: 1.6;">Nous avons examiné les pièces réglementaires de votre demande d'inscription au programme <strong>Partenaire Hospitality</strong>.</p>
            <p style="font-size: 14px; line-height: 1.6;">Nous regrettons de vous informer que votre demande ne peut être validée en l'état pour le motif suivant :</p>
            
            <div style="background-color: #2D1A1A; border-left: 4px solid #D32F2F; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 13px; color: #FF8A80; font-weight: bold;">Motif de refus :</p>
              <p style="margin: 5px 0 0 0; font-size: 13px; line-height: 1.5; color: #E0E0E0;">${reason}</p>
            </div>

            <p style="font-size: 14px; line-height: 1.6;">Nous vous invitons à vous assurer de la validité de vos documents (RCCM, Licence d'exploitation valide du Ministère du Tourisme, DFE, CNI) et à nous recontacter pour soumettre un dossier actualisé.</p>
          </div>
          <div style="text-align: center; margin-top: 20px; font-size: 11px; color: #8A8A9A;">
            <p>© 2026 EASY Luxury Transportation. Tous droits réservés.</p>
          </div>
        </div>
      `;
      sendRealEmail(user.email, emailSubject, emailText, emailHtml).catch(err => console.error("Simulated email send error", err));

      res.json({ success: true, user });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Dynamic Surcharges & Schedulers SysConfig
  app.get("/api/admin/config", requireAdmin, async (req, res) => {
    const db: any = await readDB();
    const defaults = {
      baseRates: {
        "berline-premium": { "hourly": 15000, "halfday": 55000, "fullday": 95000 },
        "suv-executive": { "hourly": 20000, "halfday": 75000, "fullday": 135000 },
        "suv-prestige": { "hourly": 35000, "halfday": 125000, "fullday": 225000 }
      },
      surcharges: { "night": 15, "weekend": 20 },
      zones: ["Abidjan Nord", "Cocody", "Plateau", "Zone 4", "Marcory", "Assinie", "Yamoussoukro", "Aéroport FHB"],
      promotions: [
        { "code": "EASYCOCO", "discount": 15, "active": true },
        { "code": "PREMIUM225", "discount": 10, "active": true }
      ]
    };
    res.json(db.system_config || defaults);
  });

  app.post("/api/admin/config", requireAdmin, async (req, res) => {
    try {
      const db: any = await readDB();
      db.system_config = {
        baseRates: req.body.baseRates,
        surcharges: req.body.surcharges,
        zones: req.body.zones,
        promotions: req.body.promotions
      };
      await writeDB(db);
      res.json(db.system_config);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Ecological Daily Report endpoints
  app.get("/api/eco-report", async (req, res) => {
    try {
      let report = await prisma.ecoReport.findUnique({
        where: { id: "daily" }
      });
      if (!report) {
        report = await prisma.ecoReport.create({
          data: {
            id: "daily",
            kmElectrique: 12450.0,
            co2NonEmis: 1850.0,
            co2EviteTonnes: 1.85,
            updatedAt: new Date().toISOString()
          }
        });
      }
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/eco-report", requireAdmin, async (req, res) => {
    try {
      const { kmElectrique, co2NonEmis, co2EviteTonnes } = req.body;
      const report = await prisma.ecoReport.upsert({
        where: { id: "daily" },
        update: {
          kmElectrique: parseFloat(kmElectrique) || 0,
          co2NonEmis: parseFloat(co2NonEmis) || 0,
          co2EviteTonnes: parseFloat(co2EviteTonnes) || 0,
          updatedAt: new Date().toISOString()
        },
        create: {
          id: "daily",
          kmElectrique: parseFloat(kmElectrique) || 0,
          co2NonEmis: parseFloat(co2NonEmis) || 0,
          co2EviteTonnes: parseFloat(co2EviteTonnes) || 0,
          updatedAt: new Date().toISOString()
        }
      });
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 8. Invoices management & auto generation
  app.get("/api/admin/invoices", requireAdmin, async (req, res) => {
    const db = await readDB();
    res.json(db.invoices || []);
  });

  app.post("/api/admin/invoices/generate", requireAdmin, async (req, res) => {
    try {
      const { type, accountId, customAmount } = req.body;
      if (!type || !accountId) {
        return res.status(400).json({ error: "AccountId and Type are required" });
      }
      const db = await readDB();

      // Find the account name
      let accountName = "";
      if (type === "corporate") {
        const u = db.users.find(x => x.id === accountId);
        accountName = u ? u.name : "Compte Entreprise";
      } else {
        const p = db.partners.find(x => x.id === accountId);
        accountName = p ? p.companyName : "Compte Partenaire";
      }

      // Group courses of corporate
      const targetMonth = new Date().getMonth() + 1;
      const targetYear = new Date().getFullYear();

      let calculatedAmount = db.reservations
        .filter(r => r.userId === accountId && r.status !== "cancelled")
        .reduce((sum, r) => sum + r.totalPrice, 0);

      if (customAmount !== undefined && customAmount !== null) {
        calculatedAmount = parseFloat(customAmount);
      }
      if (!calculatedAmount) {
         calculatedAmount = 1450000; // default preseeded amount placeholder
      }

      const newId = "inv_" + Math.random().toString(36).substr(2, 9);
      const newInvoice: Invoice = {
        id: newId,
        month: targetMonth,
        year: targetYear,
        totalAmount: calculatedAmount,
        commissionAmount: type === "partner" ? Math.floor(calculatedAmount * 0.12) : 0,
        status: "En attente de règlement",
        pdfUrl: `/api/invoices/${newId}/pdf`,
        createdAt: new Date().toISOString()
      };

      if (type === "corporate") {
        newInvoice.corporateId = accountId;
        newInvoice.partnerId = null;
      } else {
        newInvoice.partnerId = accountId;
        newInvoice.corporateId = null;
      }

      if (!db.invoices) db.invoices = [];
      db.invoices.push(newInvoice);
      await writeDB(db);

      res.status(201).json(newInvoice);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/admin/invoices/:id/status", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const db = await readDB();
      const iIndex = db.invoices.findIndex(inv => inv.id === id);
      if (iIndex === -1) {
        return res.status(404).json({ error: "Facture non trouvée" });
      }
      db.invoices[iIndex].status = status;
      await writeDB(db);
      res.json(db.invoices[iIndex]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admin/invoices/:id", requireAdmin, async (req, res) => {
     try {
       const { id } = req.params;
       const db = await readDB();
       db.invoices = db.invoices.filter(inv => inv.id !== id);
       await writeDB(db);
       res.json({ message: "Facture supprimée." });
     } catch (err: any) {
        res.status(500).json({ error: err.message });
     }
  });

  // ==========================================
  // SAVER Fleet Ops — Partie A (RBAC, sites, utilisateurs, paramètres, audit)
  // Monté avant le middleware SPA pour que les routes /api/* soient prioritaires.
  // ==========================================
  app.use(createPartARouter(prisma));

  // Job quotidien : moteur d'alertes (échéances véhicules) + renvoi des notifications
  // en échec. Idempotent : aucune action manuelle requise, aucun doublon.
  if (process.env.NODE_ENV !== "test") {
    const runAlertsJob = async () => {
      try {
        const created = await runVehicleAlerts(prisma);
        const sent = await retryPendingNotifications(prisma);
        if (created || sent) console.log(`[Alertes] ${created} alerte(s) créée(s), ${sent} notification(s) (re)envoyée(s)`);
      } catch (e) {
        console.error("[Alertes] job quotidien échoué:", e);
      }
    };
    setTimeout(runAlertsJob, 10_000); // premier passage après le démarrage
    setInterval(runAlertsJob, 24 * 60 * 60 * 1000); // puis tous les jours
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vitest/Vite middleware.");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode.");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", async (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Bind to host 0.0.0.0 and PORT 3000 (specified by constraints)
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`[EV Premium Abidjan] Backend running with Realtime WebSockets on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start full-stack server:", error);
});
