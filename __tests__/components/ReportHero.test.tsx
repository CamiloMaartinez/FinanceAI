import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ReportHero } from '../../src/components/ReportHero';

describe('ReportHero', () => {
  it('muestra los indicadores del mes y la marca', async () => {
    await render(<ReportHero income={4_000_000} expense={3_000_000} exporting={false} onExport={() => {}} />);
    expect(screen.getByText('$4.000.000')).toBeTruthy();
    expect(screen.getByText('$1.000.000')).toBeTruthy();
    expect(screen.getByText('25%')).toBeTruthy();
    expect(screen.getByLabelText('Smart Finance, informe del mes')).toBeTruthy();
  });

  it('sin ingresos la tasa de ahorro no inventa un número', async () => {
    await render(<ReportHero income={0} expense={50_000} exporting={false} onExport={() => {}} />);
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('el botón descarga el informe y se bloquea mientras se prepara', async () => {
    const onExport = jest.fn();
    const { rerender } = await render(<ReportHero income={1} expense={0} exporting={false} onExport={onExport} />);
    fireEvent.press(screen.getByLabelText('Descargar informe completo en PDF'));
    expect(onExport).toHaveBeenCalledTimes(1);

    await rerender(<ReportHero income={1} expense={0} exporting onExport={onExport} />);
    expect(screen.getByText('Preparando informe…')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Descargar informe completo en PDF'));
    expect(onExport).toHaveBeenCalledTimes(1);
  });
});
