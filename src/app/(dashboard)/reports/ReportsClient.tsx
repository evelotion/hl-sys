"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileSpreadsheet, Download, Loader2 } from 'lucide-react';
import ExcelJS from 'exceljs';
import toast from 'react-hot-toast';

export default function ReportsClient({ tickets }: { tickets: any[] }) {
  const [isExporting, setIsExporting] = useState(false);

  const generateExcel = async () => {
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Laporan Logistik');

      // 1. Styling Judul Laporan (Header Utama)
      // Lebarin merge cells sampai J1 dan J2 karena ada tambahan kolom Prioritas
      sheet.mergeCells('A1', 'J1'); 
      const titleCell = sheet.getCell('A1');
      titleCell.value = 'REPORT KINERJA HOTLINE LOGISTIK (HL-SYS) BCA SYARIAH';
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Dark Blue/Slate
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      
      const dateCell = sheet.getCell('A2');
      sheet.mergeCells('A2', 'J2');
      dateCell.value = `Tanggal Tarik Data: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}`;
      dateCell.font = { name: 'Arial', size: 10, italic: true };
      dateCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Spacing
      sheet.addRow([]);

      // 2. Setup Kolom Tabel (TAMBAHAN KOLOM PRIORITAS DI SINI)
      sheet.columns = [
        { header: 'No', key: 'no', width: 5 },
        { header: 'ID TIKET', key: 'ticketNumber', width: 18 },
        { header: 'PRIORITAS', key: 'priority', width: 15 }, // <-- TAMBAHAN KOLOM
        { header: 'TANGGAL REQUEST', key: 'requestDate', width: 20 },
        { header: 'KATEGORI', key: 'category', width: 20 },
        { header: 'CABANG/UNIT', key: 'branchName', width: 25 },
        { header: 'PEMOHON', key: 'requesterName', width: 20 },
        { header: 'PERIHAL PEKERJAAN', key: 'title', width: 45 },
        { header: 'PIC DITUGASKAN', key: 'pic', width: 20 },
        { header: 'STATUS', key: 'status', width: 15 },
      ];

      // 3. Styling Header Tabel
      const headerRow = sheet.getRow(4);
      headerRow.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }; // Indigo-600
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
      });

      // 4. Masukkan Data Dinamis
      tickets.forEach((t, index) => {
        const reqDate = t.requestDate ? new Date(t.requestDate).toLocaleDateString('id-ID') : '-';
        const statusClean = t.status.replace('_', ' ');

        const row = sheet.addRow({
          no: index + 1,
          ticketNumber: t.ticketNumber,
          priority: t.priority || 'MEDIUM', // <-- MASUKIN DATA PRIORITAS
          requestDate: reqDate,
          category: t.category,
          branchName: t.branchName,
          requesterName: t.requesterName || '-',
          title: t.title,
          pic: t.pic?.name || 'Belum di-assign',
          status: statusClean,
        });

        // Beri border pada setiap baris data
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
          };
          cell.alignment = { vertical: 'middle', wrapText: true }; // wrap text untuk perihal yang panjang
        });
      });

      // 5. Build File dan Trigger Download (Tanpa FileSaver)
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `Report_HLSYS_${new Date().getTime()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Excel berhasil di-download!');
    } catch (error) {
      toast.error('Gagal generate Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Report & Unduh Data</h2>
        <p className="text-slate-500 mt-1 font-medium text-xs">Pusat penarikan data operasional tiket logistik secara keseluruhan.</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-8 rounded-[24px] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center space-y-6">
        <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto border border-indigo-100 shadow-inner">
          <FileSpreadsheet size={36} strokeWidth={2} />
        </div>
        
        <div>
          <h3 className="text-lg font-black text-slate-800">Generate Master Data Logistik</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
            Sistem akan menyatukan seluruh riwayat tiket yang ada di database ke dalam format Microsoft Excel (.xlsx) dengan tabel yang sudah dirapikan secara otomatis.
          </p>
        </div>

        <div className="pt-4">
          <button 
            onClick={generateExcel} disabled={isExporting}
            className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white font-bold rounded-xl shadow-[0_8px_20px_rgb(79,70,229,0.3)] hover:shadow-[0_12px_25px_rgb(79,70,229,0.4)] transition-all mx-auto disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isExporting ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
            {isExporting ? 'Memproses File Excel...' : 'Unduh Laporan Excel (Semua Waktu)'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}