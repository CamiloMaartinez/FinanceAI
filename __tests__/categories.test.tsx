import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import type * as DbModule from '../src/database/db';
import { AppIcon } from '../src/components/icons/AppIcon';
import { CATEGORY_ICONS, ICON_SET, isAppIcon } from '../src/components/icons/iconSet';
import { badgeColors } from '../src/components/icons/CategoryBadge';
import { ink } from '../src/constants/theme';

describe('set de íconos', () => {
  it('trae todos los íconos pedidos', () => {
    const required = [
      'comida', 'supermercado', 'transporte', 'hogar', 'servicios', 'salud', 'educacion', 'entretenimiento',
      'ropa', 'viajes', 'mascotas', 'regalos', 'suscripciones', 'salario', 'freelance', 'inversiones', 'ahorro',
      'deudas', 'peso', 'dolar', 'euro', 'banco', 'billetera', 'tarjeta', 'cripto',
    ];
    for (const name of required) expect(isAppIcon(name)).toBe(true);
    expect(CATEGORY_ICONS.length).toBe(Object.keys(ICON_SET).length);
  });

  it('pinta el SVG propio y cae a Ionicons con nombres antiguos', async () => {
    await render(<><AppIcon name="comida" color="#000" /><AppIcon name="restaurant" color="#000" /></>);
    expect(screen.getByTestId('app-icon-comida')).toBeTruthy();
    expect(screen.queryByTestId('app-icon-restaurant')).toBeNull();
  });

  it('pastel lleva el ícono en tinta; un color saturado, fondo tenue', () => {
    expect(badgeColors('#F8C98F')).toMatchObject({ bg: '#F8C98F', fg: ink });
    expect(badgeColors('#FF9500')).toEqual({ bg: '#FF95002E', fg: '#FF9500' });
  });
});

describe('categorías en la base de datos', () => {
  let db: typeof DbModule;

  beforeEach(async () => {
    jest.resetModules();
    db = require('../src/database/db');
    const { seedIfEmpty } = require('../src/database/seed');
    await seedIfEmpty();
  });

  it('el seed usa los íconos propios sin cambiar los ids', async () => {
    const cats = await db.getAllCategories();
    expect(cats.find((c) => c.id === 'cat-alimentacion')).toMatchObject({ iconName: 'comida', colorHex: '#F8C98F' });
    expect(cats.find((c) => c.id === 'cat-otros')).toMatchObject({ iconName: 'otros' });
  });

  it('crear, editar y borrar una categoría propia; la de fábrica no se borra', async () => {
    const id = await db.insertCategory({ name: ' Café ', iconName: 'comida', colorHex: '#FBDDE6' });
    await db.updateCategory(id, { name: 'Cafecito', iconName: 'regalos', colorHex: '#CDEEF7' });
    let cat = (await db.getAllCategories()).find((c) => c.id === id)!;
    expect(cat).toMatchObject({ name: 'Cafecito', iconName: 'regalos', isDefault: 0 });

    // Un movimiento con esa categoría queda sin categoría al borrarla
    await db.createAccount('Ahorros', 'savings', 100_000, '#00f', 'banco', 'COP');
    const [acc] = await db.getAllAccounts();
    await db.createTransaction({ type: 'expense', amount: 5000, accountId: acc.id, categoryId: id, notes: 'Tinto',
      date: new Date().toISOString(), toAccountId: null, toAmount: null });
    await db.deleteCategory(id);
    expect((await db.getAllCategories()).some((c) => c.id === id)).toBe(false);
    const [tx] = await db.getAllTransactionsWithCategory();
    expect(tx.categoryId).toBeNull();

    await expect(db.deleteCategory('cat-otros')).rejects.toThrow('no se pueden borrar');
  });

  it('migra las categorías de fábrica antiguas, pero respeta las que el usuario cambió', async () => {
    const database = await db.getDb();
    await database.runAsync(`UPDATE categories SET iconName = 'restaurant', colorHex = '#FF9500' WHERE id = 'cat-alimentacion'`);
    await database.runAsync(`UPDATE categories SET iconName = 'car', colorHex = '#123456' WHERE id = 'cat-transporte'`);
    // Simula abrir una versión nueva de la app: vuelve a correr la migración
    await db.migrateDefaultCategoryStyle(database);
    const cats = await db.getAllCategories();
    expect(cats.find((c) => c.id === 'cat-alimentacion')).toMatchObject({ iconName: 'comida', colorHex: '#F8C98F' });
    expect(cats.find((c) => c.id === 'cat-transporte')).toMatchObject({ iconName: 'car', colorHex: '#123456' });
  });
});
