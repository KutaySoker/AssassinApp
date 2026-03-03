const prisma = require('../../config/db');

describe('Database Konfigürasyonu (db.js)', () => {
    test('Prisma istemcisi başarıyla oluşturulmalı ve dışa aktarılmalı', () => {
        // Objenin gerçekten var olduğunu kontrol ediyoruz
        expect(prisma).toBeDefined();
        
        // PrismaClient'ın standart fonksiyonlarından biri var mı diye bakıyoruz
        // (Eğer mocklanmamış gerçek bir PrismaClient ise buralarda bir yerlerde '$connect' veya modeller olur)
        expect(typeof prisma).toBe('object');
    });
});