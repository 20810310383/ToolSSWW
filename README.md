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

# check lịch sử đơn
node .\orders-viewer.cjs
```

Chạy từng script lần lượt; đóng Chrome của script trước rồi mới chạy script tiếp theo.

**Các lệnh có tiền tố `samsung-cart-check/` trong những mục bên dưới chỉ dùng khi terminal đang ở thư mục gốc dự án.** Nếu terminal đã ở trong `samsung-cart-check`, dùng các lệnh ngắn ở trên. Lặp tiền tố sẽ gây lỗi `MODULE_NOT_FOUND` với đường dẫn `samsung-cart-check\samsung-cart-check`.

## 1. Chuẩn bị

- Cài Node.js và Google Chrome trên Windows.
- Kết nối VPN có quyền truy cập Samsung staging.
- Mở terminal tại thư mục gốc dự án `F:\Project_XinXo\`.
- Cài Playwright nếu chưa có:

```powershell
npm ci
```

Script dùng Google Chrome đã cài trên máy, không cần tải Chromium riêng.

## 2. Thêm sản phẩm vào giỏ

```powershell
node ./addtocart.cjs
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
node ./console-order.cjs
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
node ./console-order.cjs --no-card
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

## 10. Bảng nổi theo dõi đơn trên Chrome

`console-order.cjs` và `checkout-loop.cjs` có bảng nổi ở góc trái dưới trang Samsung. Bảng hiển thị số đơn hoàn thành trong phiên chạy, tiến trình lượt, mã đơn, SKU và quantity. Màu xanh biểu thị hoàn thành, vàng là chờ xác nhận, đỏ là đã dừng. Dùng nút `− / +` để thu gọn hoặc mở rộng.

Chỉ đếm hoàn thành khi đã thấy trang xác nhận có mã đơn và đọc lại giỏ trống; đây không phải xác minh thanh toán backend. Dữ liệu bảng được khởi tạo lại khi chạy script mới. Bảng tự hiện lại sau chuyển trang và không xuất hiện trên trang Samsung Account.

Khi push Git, giữ thêm file `order-dashboard.cjs` cùng các script. Helper này đã được cho phép trong `.gitignore`.

## 11. Lịch sử đơn hàng: popup tìm kiếm và chi tiết

```powershell
node .\orders-viewer.cjs
```

Tool mở `https://stg2.shop.samsung.com/es/mypage/orders` bằng profile chung. Nếu chưa đăng nhập, đăng nhập trong Chrome rồi quay lại trang lịch sử và bấm **Làm mới**.

Nút **Lịch sử đơn** nằm ở góc phải dưới, có cả khi chạy `console-order.cjs` và `checkout-loop.cjs`.

- Tìm mã đơn, tên sản phẩm, SKU đã tải hoặc trạng thái.
- Bấm đơn để mở rộng/thu gọn. Chi tiết gồm đầy đủ SKU, quantity, giá, tổng tiền, trạng thái thanh toán và địa chỉ giao.
- **Trang tiếp** tải thêm một trang; **Tải mọi trang** tải toàn bộ danh sách.
- API danh sách chỉ có sản phẩm đại diện. Bấm **Tải đầy đủ SKU** để đọc mọi chi tiết (tối đa ba request đồng thời) trước khi tìm tất cả SKU trong lịch sử.
- **Làm mới** xóa cache popup và tải trang đầu. Popup không ghi dữ liệu ra file.
- Escape, nút × hoặc nền ngoài popup để đóng.

API đã kiểm tra HTTP 200:

```text
GET /tokocommercewebservices/v2/es/users/current/orders?currentPage=0&lang=es&curr=EUR
GET /tokocommercewebservices/v2/es/users/current/orders/{orderCode}?lang=es&curr=EUR
```

Danh sách dùng `searchPageData.results` và `searchPageData.pagination`. Chi tiết có `entries`, `totalPrice`, `statusDisplay`, `isFullAmountPaid`. `waiting-approval` là chờ duyệt, không đồng nghĩa đã thanh toán.

Popup chỉ đọc; không có thao tác hủy/sửa/đặt đơn. Đóng các Chrome automation khác trước khi chạy viewer để tránh khóa profile. Khi push source, giữ thêm `orders-popup.cjs` và `orders-viewer.cjs`.

### Thanh tiến trình 1–6 trong chi tiết đơn

Mỗi sản phẩm có thanh trạng thái từ `entries[].fulfillmentSteps`:

1. Pago recibido.
2. Pedido realizado.
3. Pedido en preparación.
4. Pedido listo para envío.
5. En camino.
6. Entregado.

Mốc được API đánh dấu `active` sẽ tô xanh. Tiến trình được hiển thị riêng từng SKU để không gộp sai các sản phẩm đang giao khác nhau. Nếu API chưa trả tiến trình, popup báo chưa có dữ liệu. Nhãn “Pago recibido” phản ánh mốc của website; kiểm tra riêng `isFullAmountPaid` và trạng thái đơn để xác định thanh toán. Với màn hình nhỏ, kéo ngang thanh tiến trình.
