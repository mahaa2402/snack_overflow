"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var bcrypt_1 = require("bcrypt");
var prisma = new client_1.PrismaClient();
var SALT_ROUNDS = 10;
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var adminPasswordHash, priyaPasswordHash, karthikPasswordHash, rekhaPasswordHash, admin, priya, karthik, rekha, snackList, legacySnackNames, createdSnacks, _i, snackList_1, s, legacyName, existingSnack, _a, snack, _b, masalaChai, mysorePak, masalaMakhana, ragiBar, now, dayMs, sampleActivities, _c, sampleActivities_1, item;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    console.log('🌱 Starting database seed for Snack Overflow...');
                    return [4 /*yield*/, bcrypt_1.default.hash('Admin@123', SALT_ROUNDS)];
                case 1:
                    adminPasswordHash = _d.sent();
                    return [4 /*yield*/, bcrypt_1.default.hash('priya123', SALT_ROUNDS)];
                case 2:
                    priyaPasswordHash = _d.sent();
                    return [4 /*yield*/, bcrypt_1.default.hash('karthik123', SALT_ROUNDS)];
                case 3:
                    karthikPasswordHash = _d.sent();
                    return [4 /*yield*/, bcrypt_1.default.hash('rekha123', SALT_ROUNDS)];
                case 4:
                    rekhaPasswordHash = _d.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: 'admin@snackoverflow.com' },
                            update: {
                                role: client_1.Role.ADMIN,
                                password: adminPasswordHash,
                                name: 'Admin 1',
                            },
                            create: {
                                email: 'admin@snackoverflow.com',
                                name: 'Admin 1',
                                password: adminPasswordHash,
                                role: client_1.Role.ADMIN,
                            },
                        })];
                case 5:
                    admin = _d.sent();
                    console.log("\u2713 Admin user: ".concat(admin.email));
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: 'alice@snackoverflow.com' },
                            update: { role: client_1.Role.MEMBER, password: priyaPasswordHash, name: 'Priya' },
                            create: { email: 'alice@snackoverflow.com', name: 'Priya', password: priyaPasswordHash, role: client_1.Role.MEMBER },
                        })];
                case 6:
                    priya = _d.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: 'bob@snackoverflow.com' },
                            update: { role: client_1.Role.MEMBER, password: karthikPasswordHash, name: 'Karthik' },
                            create: { email: 'bob@snackoverflow.com', name: 'Karthik', password: karthikPasswordHash, role: client_1.Role.MEMBER },
                        })];
                case 7:
                    karthik = _d.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: 'charlie@snackoverflow.com' },
                            update: { role: client_1.Role.MEMBER, password: rekhaPasswordHash, name: 'Rekha' },
                            create: { email: 'charlie@snackoverflow.com', name: 'Rekha', password: rekhaPasswordHash, role: client_1.Role.MEMBER },
                        })];
                case 8:
                    rekha = _d.sent();
                    console.log('✓ Member users seeded');
                    snackList = [
                        // SWEET
                        { name: 'Mysore Pak', category: client_1.SnackCategory.SWEET, quantity: 18, lowStockThreshold: 5 },
                        { name: 'Jalebi', category: client_1.SnackCategory.SWEET, quantity: 3, lowStockThreshold: 5 }, // RUNNING_LOW
                        { name: 'Kaju Katli', category: client_1.SnackCategory.SWEET, quantity: 0, lowStockThreshold: 5 }, // GONE
                        { name: 'Besan Ladoo', category: client_1.SnackCategory.SWEET, quantity: 12, lowStockThreshold: 4 },
                        // SAVOURY
                        { name: 'Masala Makhana', category: client_1.SnackCategory.SAVOURY, quantity: 24, lowStockThreshold: 6 },
                        { name: 'Banana Chips', category: client_1.SnackCategory.SAVOURY, quantity: 14, lowStockThreshold: 5 },
                        { name: 'Murukku', category: client_1.SnackCategory.SAVOURY, quantity: 4, lowStockThreshold: 5 }, // RUNNING_LOW
                        { name: 'Masala Khakhra', category: client_1.SnackCategory.SAVOURY, quantity: 9, lowStockThreshold: 4 },
                        // DRINK
                        { name: 'Masala Chai', category: client_1.SnackCategory.DRINK, quantity: 22, lowStockThreshold: 6 },
                        { name: 'Nimbu Pani', category: client_1.SnackCategory.DRINK, quantity: 30, lowStockThreshold: 8 },
                        { name: 'Filter Coffee', category: client_1.SnackCategory.DRINK, quantity: 2, lowStockThreshold: 5 }, // RUNNING_LOW
                        { name: 'Mango Lassi', category: client_1.SnackCategory.DRINK, quantity: 0, lowStockThreshold: 4 }, // GONE
                        // HEALTHY_ISH
                        { name: 'Roasted Chana', category: client_1.SnackCategory.HEALTHY_ISH, quantity: 15, lowStockThreshold: 4 },
                        { name: 'Ragi Energy Bar', category: client_1.SnackCategory.HEALTHY_ISH, quantity: 20, lowStockThreshold: 5 },
                        { name: 'Dried Amla', category: client_1.SnackCategory.HEALTHY_ISH, quantity: 5, lowStockThreshold: 5 }, // RUNNING_LOW
                        { name: 'Plain Curd Cups', category: client_1.SnackCategory.HEALTHY_ISH, quantity: 8, lowStockThreshold: 4 },
                    ];
                    legacySnackNames = {
                        'Mysore Pak': 'Dark Chocolate Almond Bark',
                        Jalebi: ' Glazed Donuts',
                        'Kaju Katli': 'Organic Gummy Bears',
                        'Besan Ladoo': 'Cinnamon Sugar Pretzel Bites',
                        'Masala Makhana': 'Kettle Cooked Sea Salt Chips',
                        'Banana Chips': 'White Cheddar Popcorn',
                        Murukku: 'Smoked Paprika Crisps',
                        'Masala Khakhra': 'Spicy Sriracha Cashews',
                        'Masala Chai': 'Cold Brew Coffee Can',
                        'Nimbu Pani': 'Sparkling Lime Water',
                        'Filter Coffee': 'Organic Ginger Kombucha',
                        'Mango Lassi': 'Matcha Green Tea Latte',
                        'Roasted Chana': 'Roasted Salted Edamame',
                        'Ragi Energy Bar': 'Mixed Berry Granola Bar',
                        'Dried Amla': 'Freeze-Dried Strawberries',
                        'Plain Curd Cups': 'Greek Yogurt Cups',
                    };
                    createdSnacks = [];
                    _i = 0, snackList_1 = snackList;
                    _d.label = 9;
                case 9:
                    if (!(_i < snackList_1.length)) return [3 /*break*/, 18];
                    s = snackList_1[_i];
                    legacyName = legacySnackNames[s.name];
                    if (!legacyName) return [3 /*break*/, 11];
                    return [4 /*yield*/, prisma.snack.findUnique({ where: { name: legacyName } })];
                case 10:
                    _a = _d.sent();
                    return [3 /*break*/, 12];
                case 11:
                    _a = null;
                    _d.label = 12;
                case 12:
                    existingSnack = _a;
                    if (!existingSnack) return [3 /*break*/, 14];
                    return [4 /*yield*/, prisma.snack.update({ where: { id: existingSnack.id }, data: __assign({}, s) })];
                case 13:
                    _b = _d.sent();
                    return [3 /*break*/, 16];
                case 14: return [4 /*yield*/, prisma.snack.upsert({
                        where: { name: s.name },
                        update: {
                            category: s.category,
                            quantity: s.quantity,
                            lowStockThreshold: s.lowStockThreshold,
                        },
                        create: s,
                    })];
                case 15:
                    _b = _d.sent();
                    _d.label = 16;
                case 16:
                    snack = _b;
                    createdSnacks.push(snack);
                    _d.label = 17;
                case 17:
                    _i++;
                    return [3 /*break*/, 9];
                case 18:
                    console.log("\u2713 Seeded ".concat(createdSnacks.length, " snacks"));
                    masalaChai = createdSnacks.find(function (s) { return s.name === 'Masala Chai'; });
                    mysorePak = createdSnacks.find(function (s) { return s.name === 'Mysore Pak'; });
                    masalaMakhana = createdSnacks.find(function (s) { return s.name === 'Masala Makhana'; });
                    ragiBar = createdSnacks.find(function (s) { return s.name === 'Ragi Energy Bar'; });
                    if (!masalaChai) return [3 /*break*/, 22];
                    // 3 votes for Masala Chai (Top snack of the week!)
                    return [4 /*yield*/, prisma.vote.upsert({
                            where: { userId_snackId: { userId: priya.id, snackId: masalaChai.id } },
                            update: {},
                            create: { userId: priya.id, snackId: masalaChai.id },
                        })];
                case 19:
                    // 3 votes for Masala Chai (Top snack of the week!)
                    _d.sent();
                    return [4 /*yield*/, prisma.vote.upsert({
                            where: { userId_snackId: { userId: karthik.id, snackId: masalaChai.id } },
                            update: {},
                            create: { userId: karthik.id, snackId: masalaChai.id },
                        })];
                case 20:
                    _d.sent();
                    return [4 /*yield*/, prisma.vote.upsert({
                            where: { userId_snackId: { userId: rekha.id, snackId: masalaChai.id } },
                            update: {},
                            create: { userId: rekha.id, snackId: masalaChai.id },
                        })];
                case 21:
                    _d.sent();
                    _d.label = 22;
                case 22:
                    if (!mysorePak) return [3 /*break*/, 25];
                    return [4 /*yield*/, prisma.vote.upsert({
                            where: { userId_snackId: { userId: priya.id, snackId: mysorePak.id } },
                            update: {},
                            create: { userId: priya.id, snackId: mysorePak.id },
                        })];
                case 23:
                    _d.sent();
                    return [4 /*yield*/, prisma.vote.upsert({
                            where: { userId_snackId: { userId: karthik.id, snackId: mysorePak.id } },
                            update: {},
                            create: { userId: karthik.id, snackId: mysorePak.id },
                        })];
                case 24:
                    _d.sent();
                    _d.label = 25;
                case 25:
                    if (!masalaMakhana) return [3 /*break*/, 27];
                    return [4 /*yield*/, prisma.vote.upsert({
                            where: { userId_snackId: { userId: rekha.id, snackId: masalaMakhana.id } },
                            update: {},
                            create: { userId: rekha.id, snackId: masalaMakhana.id },
                        })];
                case 26:
                    _d.sent();
                    _d.label = 27;
                case 27:
                    if (!ragiBar) return [3 /*break*/, 29];
                    return [4 /*yield*/, prisma.vote.upsert({
                            where: { userId_snackId: { userId: priya.id, snackId: ragiBar.id } },
                            update: {},
                            create: { userId: priya.id, snackId: ragiBar.id },
                        })];
                case 28:
                    _d.sent();
                    _d.label = 29;
                case 29:
                    console.log('✓ Seeded initial user votes');
                    now = new Date();
                    dayMs = 24 * 60 * 60 * 1000;
                    sampleActivities = [
                        // 6 days ago
                        { user: admin, snack: masalaChai, action: client_1.ActivityAction.RESTOCKED, amount: 30, daysAgo: 6 },
                        { user: priya, snack: masalaChai, action: client_1.ActivityAction.CONSUMED, amount: 2, daysAgo: 6 },
                        { user: karthik, snack: mysorePak, action: client_1.ActivityAction.CONSUMED, amount: 1, daysAgo: 6 },
                        { user: rekha, snack: masalaMakhana, action: client_1.ActivityAction.CONSUMED, amount: 2, daysAgo: 6 },
                        // 5 days ago
                        { user: priya, snack: ragiBar, action: client_1.ActivityAction.CONSUMED, amount: 1, daysAgo: 5 },
                        { user: karthik, snack: masalaChai, action: client_1.ActivityAction.CONSUMED, amount: 2, daysAgo: 5 },
                        { user: rekha, snack: mysorePak, action: client_1.ActivityAction.CONSUMED, amount: 1, daysAgo: 5 },
                        // 4 days ago
                        { user: admin, snack: masalaMakhana, action: client_1.ActivityAction.RESTOCKED, amount: 25, daysAgo: 4 },
                        { user: priya, snack: masalaMakhana, action: client_1.ActivityAction.CONSUMED, amount: 3, daysAgo: 4 },
                        { user: karthik, snack: ragiBar, action: client_1.ActivityAction.CONSUMED, amount: 2, daysAgo: 4 },
                        { user: rekha, snack: masalaChai, action: client_1.ActivityAction.CONSUMED, amount: 1, daysAgo: 4 },
                        // 3 days ago
                        { user: priya, snack: mysorePak, action: client_1.ActivityAction.CONSUMED, amount: 2, daysAgo: 3 },
                        { user: karthik, snack: masalaMakhana, action: client_1.ActivityAction.CONSUMED, amount: 2, daysAgo: 3 },
                        { user: rekha, snack: ragiBar, action: client_1.ActivityAction.CONSUMED, amount: 1, daysAgo: 3 },
                        // 2 days ago
                        { user: priya, snack: masalaChai, action: client_1.ActivityAction.CONSUMED, amount: 3, daysAgo: 2 },
                        { user: karthik, snack: mysorePak, action: client_1.ActivityAction.CONSUMED, amount: 2, daysAgo: 2 },
                        { user: rekha, snack: masalaMakhana, action: client_1.ActivityAction.CONSUMED, amount: 1, daysAgo: 2 },
                        // 1 day ago
                        { user: admin, snack: mysorePak, action: client_1.ActivityAction.RESTOCKED, amount: 20, daysAgo: 1 },
                        { user: priya, snack: masalaMakhana, action: client_1.ActivityAction.CONSUMED, amount: 2, daysAgo: 1 },
                        { user: karthik, snack: masalaChai, action: client_1.ActivityAction.CONSUMED, amount: 2, daysAgo: 1 },
                        // Today
                        { user: rekha, snack: masalaChai, action: client_1.ActivityAction.CONSUMED, amount: 2, daysAgo: 0 },
                        { user: priya, snack: mysorePak, action: client_1.ActivityAction.CONSUMED, amount: 1, daysAgo: 0 },
                        { user: karthik, snack: ragiBar, action: client_1.ActivityAction.CONSUMED, amount: 1, daysAgo: 0 },
                    ];
                    _c = 0, sampleActivities_1 = sampleActivities;
                    _d.label = 30;
                case 30:
                    if (!(_c < sampleActivities_1.length)) return [3 /*break*/, 33];
                    item = sampleActivities_1[_c];
                    if (!(item.snack && item.user)) return [3 /*break*/, 32];
                    return [4 /*yield*/, prisma.activity.create({
                            data: {
                                userId: item.user.id,
                                snackId: item.snack.id,
                                action: item.action,
                                amount: item.amount,
                                createdAt: new Date(now.getTime() - item.daysAgo * dayMs - Math.random() * 3600000),
                            },
                        })];
                case 31:
                    _d.sent();
                    _d.label = 32;
                case 32:
                    _c++;
                    return [3 /*break*/, 30];
                case 33:
                    console.log("\u2713 Seeded ".concat(sampleActivities.length, " realistic historical pantry activities"));
                    console.log('✅ Seeding completed successfully!');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
