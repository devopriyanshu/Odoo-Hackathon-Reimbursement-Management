import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clean up
  await prisma.auditLog.deleteMany();
  await prisma.approvalStep.deleteMany();
  await prisma.approvalGroupMember.deleteMany();
  await prisma.approvalGroup.deleteMany();
  await prisma.approvalRule.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  // Company
  const company = await prisma.company.create({
    data: { name: 'Acme Corp', currency: 'INR', country: 'India' },
  });

  // Users
  const adminPw = await bcrypt.hash('Admin@1234', 12);
  const managerPw = await bcrypt.hash('Manager@1234', 12);
  const employeePw = await bcrypt.hash('Employee@1234', 12);
  const financePw = await bcrypt.hash('Finance@1234', 12);

  const admin = await prisma.user.create({
    data: { companyId: company.id, email: 'admin@acme.com', password: adminPw, name: 'Alex Admin', role: 'ADMIN' },
  });

  const manager = await prisma.user.create({
    data: { companyId: company.id, email: 'manager@acme.com', password: managerPw, name: 'Mark Manager', role: 'MANAGER' },
  });

  const employee = await prisma.user.create({
    data: { companyId: company.id, email: 'employee@acme.com', password: employeePw, name: 'Emma Employee', role: 'EMPLOYEE', managerId: manager.id },
  });

  const finance = await prisma.user.create({
    data: { companyId: company.id, email: 'finance@acme.com', password: financePw, name: 'Frank Finance', role: 'MANAGER' },
  });

  // Rule 1: Standard Flow (Sequential, manager-first, finance approver)
  const standardRule = await prisma.approvalRule.create({
    data: {
      companyId: company.id,
      name: 'Standard Flow',
      description: 'Manager first, then finance approval for all expenses',
      isManagerFirstApprover: true,
      ruleType: 'SEQUENTIAL',
      isActive: true,
      priority: 1,
      categories: [],
    },
  });

  const financeGroup = await prisma.approvalGroup.create({
    data: { ruleId: standardRule.id, companyId: company.id, name: 'Finance Team', sequence: 1 },
  });

  await prisma.approvalGroupMember.create({
    data: { groupId: financeGroup.id, userId: finance.id },
  });

  // Rule 2: High Value Auto-CFO (Hybrid)
  const highValueRule = await prisma.approvalRule.create({
    data: {
      companyId: company.id,
      name: 'High Value Auto-CFO',
      description: 'Expenses above 50,000 INR — CFO approval or 60% threshold',
      minAmount: 50000,
      ruleType: 'HYBRID',
      percentageThreshold: 60,
      specificApproverId: admin.id,
      isActive: true,
      priority: 10,
      categories: ['TRAVEL', 'ACCOMMODATION'],
    },
  });

  const highValueGroup = await prisma.approvalGroup.create({
    data: { ruleId: highValueRule.id, companyId: company.id, name: 'Finance & Admin', sequence: 1 },
  });

  await prisma.approvalGroupMember.createMany({
    data: [
      { groupId: highValueGroup.id, userId: finance.id },
      { groupId: highValueGroup.id, userId: admin.id },
    ],
  });

  // Sample expenses
  const expenseData = [
    { status: 'APPROVED', amount: 1200, currency: 'INR', category: 'MEALS', description: 'Team lunch at local restaurant', days: 10 },
    { status: 'APPROVED', amount: 25000, currency: 'INR', category: 'TRAVEL', description: 'Flight tickets to Mumbai conference', days: 8 },
    { status: 'IN_REVIEW', amount: 3500, currency: 'INR', category: 'EQUIPMENT', description: 'Wireless keyboard and mouse for home office', days: 3 },
    { status: 'PENDING', amount: 800, currency: 'INR', category: 'SOFTWARE', description: 'Monthly subscription for design tool', days: 1 },
    { status: 'REJECTED', amount: 75000, currency: 'INR', category: 'ACCOMMODATION', description: 'Hotel stay for 3 nights during client visit', days: 15 },
  ];

  for (const data of expenseData) {
    const date = new Date();
    date.setDate(date.getDate() - data.days);

    const expense = await prisma.expense.create({
      data: {
        companyId: company.id,
        submittedById: employee.id,
        amount: data.amount,
        currency: data.currency,
        amountInBase: data.amount,
        exchangeRate: 1,
        category: data.category,
        description: data.description,
        expenseDate: date,
        status: data.status,
      },
    });

    await prisma.auditLog.create({
      data: { expenseId: expense.id, actorId: employee.id, action: 'SUBMITTED', metadata: JSON.stringify({ action: 'SUBMITTED' }) },
    });

    if (data.status === 'APPROVED') {
      await prisma.auditLog.create({
        data: { expenseId: expense.id, actorId: manager.id, action: 'APPROVED' },
      });
    }

    if (data.status === 'REJECTED') {
      await prisma.auditLog.create({
        data: { expenseId: expense.id, actorId: finance.id, action: 'REJECTED', metadata: JSON.stringify({ comment: 'Exceeds company policy limit' }) },
      });
    }
  }

  console.log('✅ Seed complete!');
  console.log('\n📋 Demo Credentials:');
  console.log('  Admin:    admin@acme.com    / Admin@1234');
  console.log('  Manager:  manager@acme.com  / Manager@1234');
  console.log('  Employee: employee@acme.com / Employee@1234');
  console.log('  Finance:  finance@acme.com  / Finance@1234');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
