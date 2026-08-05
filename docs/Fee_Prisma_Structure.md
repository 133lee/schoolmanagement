enum FeeType {
TUITION
BOARDING
EXAM
PTA
UNIFORM
TRANSPORT
OTHER
}

enum PaymentMethod {
CASH
MOBILE_MONEY // e.g., MTN MoMo, Airtel Money
BANK_TRANSFER
CHEQUE
}

enum PaymentStatus {
PENDING
CONFIRMED
REFUNDED
DECLINED
}

enum FeeStatus {
UNBILLED
BILLED
PARTIAL
PAID
OVERDUE
WAIVED
}

model FeeStructure {
id String @id @default(cuid())
academicYearId String
gradeId String? // Optional if some fees are school-wide
amount Float
type FeeType
description String?
dueDate DateTime?
isMandatory Boolean @default(true)
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

academicYear AcademicYear @relation(fields: [academicYearId], references: [id], onDelete: Cascade)
grade Grade? @relation(fields: [gradeId], references: [id], onDelete: SetNull)
studentFees StudentFee[]

@@index([academicYearId, type])
@@map("fee_structures")
}

model StudentFee {
id String @id @default(cuid())
studentId String
feeStructureId String
termId String? // Link to Term for term-specific billing
amountDue Float
amountPaid Float @default(0.0)
discountApplied Float @default(0.0) // For waivers/scholarships
status FeeStatus @default(UNBILLED)
dueDate DateTime?
billedDate DateTime?
notes String?
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

student Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
feeStructure FeeStructure @relation(fields: [feeStructureId], references: [id], onDelete: Cascade)
term Term? @relation(fields: [termId], references: [id], onDelete: SetNull)
payments Payment[]
discounts FeeDiscount[]

@@unique([studentId, feeStructureId, termId]) // Prevent duplicates per student/fee/term
@@index([studentId, status])
@@map("student_fees")
}

model Payment {
id String @id @default(cuid())
studentFeeId String? // Link to specific fee (optional for general payments)
studentId String
amount Float
date DateTime @default(now())
method PaymentMethod
status PaymentStatus @default(PENDING)
reference String? // e.g., transaction ID from mobile money
receiptNumber String? @unique
notes String?
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

student Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
studentFee StudentFee? @relation(fields: [studentFeeId], references: [id], onDelete: SetNull)

@@index([studentId, date])
@@map("payments")
}

model FeeDiscount {
id String @id @default(cuid())
studentFeeId String
amount Float
reason String? // e.g., "Vulnerable child waiver"
approvedById String? // Link to TeacherProfile or User for approver
approvedAt DateTime?
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

studentFee StudentFee @relation(fields: [studentFeeId], references: [id], onDelete: Cascade)
approvedBy TeacherProfile? @relation(fields: [approvedById], references: [id])

@@index([studentFeeId])
@@map("fee_discounts")
}

// Optional: For auditing or reports
model FeeLedger {
id String @id @default(cuid())
studentId String
academicYearId String
termId String?
transactionType String // e.g., "BILL", "PAYMENT", "DISCOUNT", "PENALTY"
amount Float
balanceAfter Float
date DateTime @default(now())
referenceId String? // Link to Payment, StudentFee, etc.

student Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
academicYear AcademicYear @relation(fields: [academicYearId], references: [id], onDelete: Cascade)
term Term? @relation(fields: [termId], references: [id], onDelete: SetNull)

@@index([studentId, academicYearId])
@@map("fee_ledgers")
}
