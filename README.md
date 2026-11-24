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

## 12. Ứng dụng Windows .exe — bản 1.1, by Khắc Tú

Mở **`dist/1.1.2/Samsung-Staging-Toolkit-1.1.2.exe`**. Máy chạy cần Windows x64, Google Chrome và VPN truy cập staging, không cần Node.js/VS Code. Không chạy chung với bản .exe khác dùng cùng profile.

### Mục 1 — Tự thêm giỏ + checkout

Màn hình này có form riêng; nhập xong mới bấm **Run — thêm giỏ & checkout**:

- **ROOT**: website staging, ví dụ `https://stg2.shop.samsung.com`.
- **API**: Commerce API, ví dụ `https://s2-smn-api-cdn.ecom-stg.samsung.com/tokocommercewebservices/v2/es`.
- Một/nhiều SKU, quantity min/max, cách đổi quantity và số lượt (`1` là đơn lẻ).
- Số thẻ test, chủ thẻ, hạn `MM/YY` và CVV/CVC. Bỏ chọn Tự điền thẻ nếu muốn tự nhập ở bước 3.

Thẻ được giữ trong bộ nhớ phiên chạy; không lưu vào cấu hình hay log. ROOT/API được ghi nhớ cục bộ. Chế độ cố định dùng quantity min. App chỉ điền thẻ trong iframe Adyen test.

App tự thêm phần quantity còn thiếu vào giỏ, chuyển checkout đến bước 3 và chờ bạn xác nhận điều khoản/đặt hàng trong Chrome. Không tự bấm đặt hàng. Có mã đơn trên trang xác nhận và giỏ trống mới chuyển lượt tiếp theo. App không tự xóa giỏ hoặc retry khi lỗi. Nếu giỏ có SKU ngoài kế hoạch, quantity vượt kế hoạch hay không có giao tận nhà miễn phí, app dừng để bạn kiểm tra.

Địa chỉ test hiện tại được cấu hình trong `desktop/runner.cjs`. Tài khoản Samsung được đăng nhập trực tiếp trên website khi cần.

### Mục 2 — Lịch sử đơn chi tiết, chạy song song

Menu này hiển thị **màn hình riêng**, không có form SKU/thẻ. Có thể mở trong khi checkout đang chạy:

1. Mặc định chọn **Dùng ROOT/API của mục checkout** để dùng đúng môi trường đang chạy.
2. Bấm **Mở tab lịch sử đơn**. App tạo tab riêng trong cùng Chrome/context nên dùng chung đăng nhập; tab checkout không bị điều hướng.
3. Trên `mypage/orders`, chỉ hiện nút **Lịch sử đơn** ở góc phải dưới. Bấm nút mới mở popup.
4. Tìm kiếm theo mã đơn/SKU đã tải/trạng thái; bấm đơn để mở rộng chi tiết và tiến trình 6 mốc. Có tải mọi trang và đầy đủ SKU.

Bấm mở lại sẽ đưa tab lịch sử đang có lên trước, không tạo nhiều tab trùng. Đang dùng Chrome cùng phiên thì ROOT/API phải trùng; muốn đổi môi trường, bấm **Dừng Chrome** trước. Bấm Dừng đóng cả tab checkout và lịch sử; đóng popup chỉ ẩn bảng, không dừng checkout.

Lịch sử chỉ đọc dữ liệu, không có thao tác hủy/sửa đơn. Popup chỉ được chèn trong tab lịch sử; app không thay đổi DOM trang checkout. Trạng thái chờ duyệt không đồng nghĩa đã thanh toán.

### Phiên đăng nhập và build

Profile desktop nằm trong thư mục dữ liệu ứng dụng dưới `%APPDATA%`, thư mục con `chrome-profile`, tách với `checkout-profile` của script terminal. Không chia sẻ profile. File portable không chứa cookie, profile cũ, `.env`, log hay các script thử nghiệm.

Chạy giao diện từ source (terminal trong thư mục repo):

```powershell
npm ci
npm run desktop
```

Build lại:

```powershell
npm run build:exe
```

Build dạng thư mục:

```powershell
npm run build:dir
```

Output bản 1.1 nằm tại `dist/1.1.0/`. File portable có thể phân phối riêng. Với exe trong `win-unpacked`, phải giữ cả thư mục cùng DLL/resources. `dist/` được ignore trên Git. Bản nội bộ chưa ký số, không tự cập nhật.

Khi push source, giữ thư mục `desktop/`, `orders-popup.cjs`, `package.json` và `package-lock.json`. Gói build chỉ whitelist các file runtime cần thiết.

Đã kiểm tra hai màn hình, nhập thẻ/validation, mở lịch sử khi checkout đang active bằng kiểm thử giả lập và chia sẻ context/tab. Đã kiểm tra mở lịch sử thực tế trong Chrome ở chế độ chỉ đọc. Chưa kiểm thử một đơn thanh toán hoàn chỉnh bằng phiên bản desktop này.

### Build + nén RAR + dọn build cũ (bản 1.1.1)

```powershell
npm run release:rar
```

Cần WinRAR có `Rar.exe` ở vị trí cài mặc định. Nếu cài nơi khác, đặt `RAR_PATH` trỏ tới `Rar.exe` trước khi chạy.

Lệnh sẽ build exe portable, nén RAR, kiểm tra toàn vẹn archive bằng `rar t`, sau đó mới xóa các bản phát hành cũ trong `dist/`. Chỉ dọn thư mục phiên bản/`win-unpacked` và file phát hành có tên đúng mẫu; không xóa source, profile hay dữ liệu ngoài `dist`. Nếu Windows khóa bản cũ đang mở, script báo rõ bản chưa xóa được; đóng app cũ rồi chạy lại.

File hiện tại:

```text
dist/1.1.2/Samsung-Staging-Toolkit-1.1.2.exe
dist/1.1.2/Samsung-Staging-Toolkit-1.1.2.rar
```

Bản này tự cuộn/focus checkbox ở bước 3 nhưng không tự tích điều khoản hoặc bấm đặt hàng. Bạn thực hiện hai thao tác cuối trong Chrome.

### ??ng g?i to?n b? ?ng d?ng, kh?ng x?a b?n c?

```powershell
npm run release:rar
```

M?i l?n ch?y t?o th? m?c m?i `dist/<version>-<m? ri?ng>/`, kh?ng ghi ?? ho?c x?a b?n c?. RAR g?m `win-unpacked/` ??y ?? EXE, DLL, resources, locales; file EXE portable v? `HUONG-DAN.txt`. Kh?ng ??ng g?i cookie, profile hay log c? nh?n. Script ki?m tra CRC v? danh s?ch file trong RAR tr??c khi b?o ho?n t?t. C?n WinRAR/Rar.exe ho?c c?u h?nh `RAR_PATH`.

## 13. Add to cart riêng trên desktop và terminal (chưa build EXE)

Mở desktop từ source, terminal đang ở trong thư mục repo `samsung-cart-check`:

```powershell
npm install
npm run desktop
```

Nếu đang ở thư mục cha, `cd .\samsung-cart-check` trước. Không cần chạy lệnh build để xem giao diện mới.

Chọn menu **Add to cart**: nhập URL cart đầy đủ, API, danh sách SKU dấu phẩy và quantity chung. Xem hướng dẫn cập nhật bên dưới.

Menu terminal mới:

```powershell
npm run cli
```

Chọn `1` thêm một SKU, `2` thêm nhiều SKU, `0` thoát. Script sẽ hỏi số SKU và quantity riêng. Hoặc chạy trực tiếp menu cũ:

```powershell
node .\addtocart.cjs
```

Bỏ qua bước chọn chế độ nếu muốn:

```powershell
node .\addtocart.cjs --single
node .\addtocart.cjs --multi
```

Đóng Chrome automation khác nếu đang khóa cùng profile. Bản EXE đã build trước đó chưa có mục Add to cart mới này. Đã kiểm tra giao diện/IPC và xử lý thêm nhiều SKU, giữ SKU cũ, báo lỗi từng mã bằng giả lập; chưa chạy thêm hàng thật ở lần cập nhật này.

### Add to cart trên desktop: URL cart, quantity chung và cookie

Chạy `npm run desktop`, chọn **Add to cart**.

- **ROOT**: nhập URL cart đầy đủ, ví dụ `https://stg2.shop.samsung.com/es/cart` hoặc URL cart country khác.
- **API**: nhập Commerce API tương ứng country. Không tự thay country của API bạn nhập.
- **SKU**: một hoặc nhiều mã cách nhau bằng dấu phẩy; mã trùng chỉ thêm một lần.
- **Quantity**: một số chung áp dụng cho mỗi SKU; đây là lượng cộng thêm. Desktop không còn chế độ quantity riêng.
- Chỉ báo xanh khi số lượng trong giỏ xác nhận đã tăng đủ. Nếu một phần thất bại, kết quả tổng báo cảnh báo và nêu số SKU thành công; không tự gửi lại.
- **Xoá cookie & lấy lại**: dùng sau khi tác vụ kết thúc và Chrome của tool còn mở. Xoá cookie trong phiên Chrome đó, chạy getcookie rồi mở lại đúng URL ROOT. Cookie đăng nhập/giỏ phiên cũ cũng bị xoá; giỏ có thể thay đổi theo phiên mới. Không xoá thư mục profile.

Luồng thêm giỏ: getcookie → URL cart đã nhập → API thêm SKU → kiểm tra giỏ → getcookie nếu có mã thành công → mở lại URL cart. Chưa build EXE cho thay đổi này.

Sau khi **Xoá cookie & lấy lại** hoàn tất, desktop hỏi **Thêm lại SKU vào giỏ?**. Chọn **Có** để thêm danh sách SKU và quantity chung đang nhập; chọn **Không** (hoặc Esc) để chỉ giữ trang cart, không gọi API thêm hàng. Nếu reset lỗi sẽ không hỏi và không thêm SKU. Quantity cộng thêm vào giỏ của phiên mới, không khôi phục toàn bộ giỏ cũ.

### Tối ưu hiệu năng desktop

Giao diện khởi động trước; Playwright chỉ được nạp khi bắt đầu tác vụ. Nhật ký được gom theo khung hình, giới hạn 500 dòng và không kéo xuống khi bạn đang đọc log cũ. Add to cart dùng lại tab cart còn mở, không tạo thêm tab sau mỗi lượt. Bỏ độ trễ nhân tạo slowMo; các bước vẫn chờ điều kiện Playwright/API.

Để so sánh tốc độ khởi động, mở bản thư mục `win-unpacked/Samsung Staging Toolkit.exe` (giữ đủ file đi kèm). EXE portable vẫn có bước giải nén runtime khi mở. Source mới chạy bằng `npm run desktop`; cần build lại để EXE có các thay đổi này.

### Trình duyệt trong app

Chạy `npm run desktop`. Add to cart tự mở tab **Trình duyệt** bằng Chromium của Electron, không cần cửa sổ Chrome cho thao tác thêm giỏ. Tab có quay lại, tiến tới, tải lại và đóng trang. Lịch sử mở tab thứ hai trong cùng phiên nhúng. Chuyển menu để quay về cấu hình hoặc nhật ký. Reset cookie dùng phiên nhúng và đưa bạn về form để chọn Có/Không thêm lại SKU.

Phiên nhúng được lưu riêng, không dùng cookie Chrome cũ; cần đăng nhập lại. Checkout hiện vẫn dùng Google Chrome ngoài app, chưa chuyển vào trình duyệt nhúng và không dùng chung đăng nhập với phiên nhúng. Đã kiểm tra luồng cart/reset/lịch sử với HTTPS giả lập; đăng nhập Samsung thực tế và iframe thanh toán chưa được xác minh trong Chromium nhúng. Bản EXE cũ chưa có tính năng này; chưa build mới.

Trong tab **Trình duyệt**, nhấn **+** để mở tab trống. Nhập hoặc sửa thanh URL rồi nhấn **Enter** để truy cập trên tab đang chọn. Có thể bỏ tiền tố `https://`; app tự bổ sung. Chỉ hỗ trợ HTTPS. Việc nhập URL không thay ROOT/API trong form chạy.

### Chọn trình duyệt cho chức năng trong app

Ở đầu app, chọn **Trình duyệt trong app** hoặc **Google Chrome bên ngoài** trước khi chạy. Lựa chọn áp dụng cho Add to cart, checkout/chạy nhiều lượt, lịch sử và reset cookie; được nhớ cho lần mở sau. Khi một lượt đang chạy, bộ chọn bị khoá.

Mỗi loại trình duyệt giữ cookie và đăng nhập riêng; đổi lựa chọn không chuyển cookie. Muốn lịch sử cùng tài khoản với checkout thì chọn cùng loại trình duyệt. Reset cookie tác động lên loại đang chọn và vẫn hỏi Có/Không thêm lại SKU. Nút Dừng đóng các phiên của tool. Mục Trình duyệt với nút +/thanh URL luôn quản lý tab nhúng.

Checkout nhúng được nối với Playwright qua cổng DevTools cục bộ. Đã kiểm tra kết nối, truyền lựa chọn và luồng cart/reset/lịch sử giả lập. Kiểm tra tự động phần checkout thanh toán bị bộ duyệt an toàn chặn do source có bước tự xác nhận/đặt đơn; chưa xác minh checkout thực tế trong trình duyệt nhúng. Chưa build EXE mới cho thay đổi này.

### Checkout khi có SKU hết hàng

Trong luồng thêm giỏ + checkout, lỗi `noStock`/`InsufficientStockError` được ghi cảnh báo rồi tiếp tục SKU tiếp theo. Tool đọc lại giỏ, checkout với SKU và quantity thực sự có trong giỏ (nếu chỉ thêm được một phần quantity sẽ báo cảnh báo). Nếu không có SKU nào, lượt đó bị bỏ qua; không mở checkout. Lỗi khác như đăng nhập, mạng hoặc API không xác định vẫn dừng để tránh dùng giỏ chưa rõ trạng thái. Kết quả từng lượt hiển thị danh sách đã xác nhận.

### Ban 1.1.6: khoi dong va man hinh den

Ban dong goi dung render phan mem de tranh loi GPU/driver. Neu giao dien khong khoi tao, app hien thong bao loi va ghi `%APPDATA%/samsung-staging-toolkit/startup.log`. Chua du log de ket luan nguyen nhan tren may khac. Giai nen day du va thu `KHOI-DONG.cmd` de loai tru bien `ELECTRON_RUN_AS_NODE` thua ke tu IDE/terminal. Launcher chi thay bien cho lan chay do.

Quy trinh release tao ban sao source tam de checkout dung o buoc 3; giu nguyen hai dong click trong source runner goc theo yeu cau. Ban cu chi duoc xoa trong dist sau khi goi moi kiem tra thanh cong.

### Desktop man hinh den khi chay npm

Chay `npm run desktop`: launcher tu loai bien `ELECTRON_RUN_AS_NODE` cho tien trinh app, khong thay bien he thong. Neu van den, dong cua so app roi thu `npm run desktop:fresh`. Lenh nay dung profile kiem tra moi, khong xoa profile/cookie cu; can dang nhap lai trong phien kiem tra. Neu profile moi hien UI con profile cu khong hien, can kiem tra cache/session cua profile cu, khong ket luan la thieu chu ky. Neu ca hai deu den, gui noi dung startup.log va loi terminal de khoanh vung.
