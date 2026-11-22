# Hướng dẫn chạy Samsung staging bằng Node.js

## Chạy nhanh khi terminal đang ở trong `samsung-cart-check`

Nếu prompt terminal đang là:

```text
PS F:\samsung-cart-check>
```

Chạy trực tiếp tên file, không thêm `samsung-cart-check/` lần nữa:

```powershell
# Cài dependency nếu chưa có
npm install

# Thêm một hoặc nhiều SKU
node .\addtocart.cjs

# Checkout đến bước 3 và điền thẻ test
node .\console-order.cjs

# Checkout đến bước 3, tự nhập thẻ
node .\console-order.cjs --no-card

# Chạy luồng thêm giỏ → checkout nhiều lượt, chờ xác nhận ở bước 3
node .\checkout-loop.cjs

# Xem trước kế hoạch lặp SKU/quantity, không mở Chrome
node .\checkout-loop.cjs --dry-run
```

Chạy từng script lần lượt; đóng Chrome của script trước rồi mới chạy script tiếp theo.

**Các lệnh có tiền tố `samsung-cart-check/` trong những mục bên dưới chỉ dùng khi terminal đang ở thư mục gốc dự án.** Nếu terminal đã ở trong `samsung-cart-check`, dùng các lệnh ngắn ở trên. Lặp tiền tố sẽ gây lỗi `MODULE_NOT_FOUND` với đường dẫn `samsung-cart-check\samsung-cart-check`.

## 1. Chuẩn bị

- Cài Node.js và Google Chrome trên Windows.
- Kết nối VPN có quyền truy cập Samsung staging.
- Mở terminal tại thư mục gốc dự án `F:\Project_XinXo\`.
- Cài Playwright nếu chưa có:

```powershell
npm install --prefix samsung-cart-check --no-audit --no-fund playwright
```

Script dùng Google Chrome đã cài trên máy, không cần tải Chromium riêng.

## 2. Thêm sản phẩm vào giỏ

```powershell
node samsung-cart-check/addtocart.cjs
```

Làm theo câu hỏi tại terminal:

1. Chọn `1` để thêm một SKU hoặc `2` để thêm nhiều SKU.
2. Nếu chọn nhiều SKU, nhập số SKU cần thêm.
3. Nhập từng mã SKU và số lượng muốn **cộng thêm**.
4. Xem danh sách và nhập `y` để tiếp tục.

Ví dụ SKU: `RB33J3515S9/EF`.

Script mở Chrome, vào trang lấy cookie trước, gọi API thêm từng sản phẩm và đọc lại giỏ để kiểm tra. Nếu nhập trùng SKU trong cùng lần chạy, số lượng được cộng gộp.

**Mỗi lần chạy addtocart là một lần cộng thêm số lượng.** Khi có lỗi hoặc kết quả chưa khớp, kiểm tra giỏ trước khi chạy lại để tránh thêm trùng.

Khi hoàn tất, nhấn Enter tại terminal để đóng Chrome và lưu phiên trước khi chạy script order.

## 3. Chạy checkout đến bước 3

```powershell
node samsung-cart-check/console-order.cjs
```

Chọn một trong ba chế độ:

- `1`: nhập một SKU, rồi nhập số lượng.
- `2`: nhập nhiều SKU cách nhau bằng dấu phẩy, rồi nhập số lượng cho từng mã.
- `3`: dùng toàn bộ giỏ hiện tại, không thêm SKU mới.

Ví dụ chế độ nhiều SKU:

```text
Chon 1/2/3 [1]: 2
Nhap cac SKU, cach nhau bang dau phay: RB33J3515S9/EF, SM-S921BLGDEUB
Tong so luong RB33J3515S9/EF trong gio [1]: 1
Tong so luong SM-S921BLGDEUB trong gio [1]: 2
```

Ví dụ trên minh họa cách nhập; khả năng checkout phụ thuộc sản phẩm và phương thức giao hàng được staging cung cấp.

### Cách hiểu số lượng

Số lượng trong `console-order.cjs` là **tổng số lượng mong muốn trong giỏ**, khác với số lượng cộng thêm của `addtocart.cjs`.

- Nếu SKU đã đủ số lượng, script không thêm lại.
- Nếu còn thiếu, script chỉ thêm phần thiếu.
- Nếu giỏ có SKU ngoài danh sách đã nhập, script dừng. Bạn xóa SKU thừa hoặc chọn chế độ `3`.
- Nếu số lượng hiện tại lớn hơn yêu cầu, script dừng để bạn giảm thủ công.
- Nếu chọn `3` nhưng giỏ trống, chạy lại và chọn `1` hoặc `2`.

### Luồng tự động

1. Mở trang lấy cookie.
2. Mở cart, kiểm tra và thêm các SKU được yêu cầu.
3. Bấm **Tramitar pedido**.
4. Nếu chưa đăng nhập, mở Samsung Account. Bạn tự nhập tài khoản trong Chrome; script chờ tối đa 10 phút rồi tự tiếp tục sau đăng nhập.
5. Điền thông tin liên hệ và địa chỉ test đã cấu hình.
6. Chọn giao tận nhà miễn phí cho từng nhóm giao hàng.
7. Đến bước **Métodos de pago**, chọn **Tarjeta Bancaria**, mở thẻ mới và điền thẻ test.
8. Giữ Chrome mở để bạn kiểm tra và tự xác nhận.

Script không tự tích điều khoản, không tự chọn lưu thẻ và không tự bấm **Realizar pedido**.

Muốn đến bước 3 nhưng tự nhập thẻ:

```powershell
node samsung-cart-check/console-order.cjs --no-card
```

## 4. Thông tin test hiện tại

Các giá trị sau nằm trong `console-order.cjs`; chỉnh trong file nếu cần dùng bộ dữ liệu test khác:

- Điện thoại: `651234567`.
- NIF/NIE: `00045678T`.
- Địa chỉ: `Carrer de Muntaner, 460`, `08006`, Barcelona, Tây Ban Nha.
- Chủ thẻ test: `Classic`.
- Số thẻ test: `4111 1111 4555 1142`.
- Hạn: `03/30`; CVV: `737`.

Chỉ dùng bộ thẻ test với Samsung staging và Adyen test. Script chỉ tìm các trường thẻ trên domain `checkoutshopper-test.adyen.com`.


### Không truy cập được trang hoặc timeout

Kiểm tra VPN và thử mở hai link:

- https://stg3.shop.samsung.com/getcookie.html
- https://stg2.shop.samsung.com/es/cart



RB33J3515S9/EF,RB38C600CS9/EF,RB34C600CSA/EF
