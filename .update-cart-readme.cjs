const fs=require('fs');let s=fs.readFileSync('README.md','utf8');const start=s.indexOf('### Cập nhật Add to cart:');if(start>=0)s=s.slice(0,start);s+=`### Add to cart trên desktop: URL cart, quantity chung và cookie

Chạy \`npm run desktop\`, chọn **Add to cart**.

- **ROOT**: nhập URL cart đầy đủ, ví dụ \`https://stg2.shop.samsung.com/es/cart\` hoặc URL cart country khác.
- **API**: nhập Commerce API tương ứng country. Không tự thay country của API bạn nhập.
- **SKU**: một hoặc nhiều mã cách nhau bằng dấu phẩy; mã trùng chỉ thêm một lần.
- **Quantity**: một số chung áp dụng cho mỗi SKU; đây là lượng cộng thêm. Desktop không còn chế độ quantity riêng.
- Chỉ báo xanh khi số lượng trong giỏ xác nhận đã tăng đủ. Nếu một phần thất bại, kết quả tổng báo cảnh báo và nêu số SKU thành công; không tự gửi lại.
- **Xoá cookie & lấy lại**: dùng sau khi tác vụ kết thúc và Chrome của tool còn mở. Xoá cookie trong phiên Chrome đó, chạy getcookie rồi mở lại đúng URL ROOT. Cookie đăng nhập/giỏ phiên cũ cũng bị xoá; giỏ có thể thay đổi theo phiên mới. Không xoá thư mục profile.

Luồng thêm giỏ: getcookie → URL cart đã nhập → API thêm SKU → kiểm tra giỏ → getcookie nếu có mã thành công → mở lại URL cart. Chưa build EXE cho thay đổi này.
`;s=s.replace(/Chọn menu \*\*Add to cart\*\*:.*?(?=\r?\n\r?\n)/,'Chọn menu **Add to cart**: nhập URL cart đầy đủ, API, danh sách SKU dấu phẩy và quantity chung. Xem hướng dẫn cập nhật bên dưới.');fs.writeFileSync('README.md',s);
