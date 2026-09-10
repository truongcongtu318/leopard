# Definition of Done

Một story hoàn tất khi:

- Acceptance criteria đạt và traceability matrix được cập nhật nếu cần.
- Code review hoàn tất, không còn P0/P1 issue.
- Unit/integration/E2E phù hợp đã chạy và pass.
- Authorization, ownership và validation được kiểm tra phía API.
- UI có responsive cùng loading, empty, error, success và permission state.
- Migration/seed chạy lặp lại an toàn nếu có thay đổi data.
- Structured log/audit có mặt cho hành động vận hành cần thiết.
- Tài liệu API, UI, data hoặc setup được cập nhật cùng behavior.
- Build thành công và smoke test liên quan đạt trên staging.
- Không chứa secret, fixture nhạy cảm hoặc refactor ngoài phạm vi.
