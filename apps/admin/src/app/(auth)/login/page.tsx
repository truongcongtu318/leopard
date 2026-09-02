import type { Metadata } from "next";
import { LoginClientWrapper } from "./LoginClientWrapper";

export const metadata: Metadata = {
  title: "Đăng nhập — LEOPARD Operations & Vận Tải Trọng Tải Lớn",
  description: "Hệ thống kết nối vận tải hàng hóa trọng tải lớn LEOPARD",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#EEF3F9] text-[#0B1F3A] flex flex-col justify-between selection:bg-[#2E6FD6] selection:text-white">
      {/* Top Operations Header Bar */}
      <header className="w-full border-b border-[#CAD9EB] bg-white/90 backdrop-blur-md px-6 py-3 flex items-center justify-between z-30 sticky top-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#0B1F3A] p-0.5 flex items-center justify-center shadow-md shadow-[#0B1F3A]/10">
            <svg className="w-6 h-6 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 17h2c.55 0 1-.45 1-1v-3c0-.55-.45-1-1-1h-1V7c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3zm-12 1.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM17 11V7h1.5l1.5 4h-3z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-wider text-[#0B1F3A]">LEOPARD</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD] uppercase tracking-wide">
                Heavy Cargo
              </span>
            </div>
            <p className="text-xs text-[#5B6B80] font-medium hidden sm:block">
              Hệ Thống Kết Nối Vận Tải Hàng Hóa Trọng Tải Lớn & Vừa
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-medium">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#DCFCE7] border border-[#86EFAC] text-[#15803D]">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-ping" />
            <span className="font-bold">Hệ Thống Sẵn Sàng</span>
          </div>
        </div>
      </header>

      {/* Main 2-Column Auth Experience */}
      <main className="flex-1 flex items-center justify-center z-20">
        <LoginClientWrapper />
      </main>

      {/* Bottom Footer */}
      <footer className="w-full border-t border-[#CAD9EB] bg-white/80 py-4 px-6 text-center text-xs text-[#5B6B80] z-20">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#0B1F3A]">LEOPARD Operations Platform</span>
            <span>•</span>
            <span>Bản quyền © 2026</span>
          </div>
          <div className="flex items-center gap-4 text-[#5B6B80] font-medium">
            <span>Tối ưu ghép hàng VRP</span>
            <span>•</span>
            <span>AI Vietmap ETA</span>
            <span>•</span>
            <span>Thanh toán VietQR</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
