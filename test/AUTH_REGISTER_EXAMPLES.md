# Auth API - Registration & Login Examples

## 📝 Đăng ký tài khoản mới

### 1. Đăng ký tài khoản

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "account": "testuser",
    "email": "testuser@example.com",
    "password": "123456"
  }'
```

**Response thành công (201):**
```json
{
  "statusCode": 201,
  "data": {
    "user": {
      "id": 5,
      "account": "testuser",
      "email": "testuser@example.com",
      "role": "USER"
    }
  }
}
```

---

### 2. Lỗi khi tài khoản đã tồn tại

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "account": "admin",
    "email": "newemail@example.com",
    "password": "123456"
  }'
```

**Response lỗi (409 Conflict):**
```json
{
  "statusCode": 409,
  "message": "Tên tài khoản đã được sử dụng"
}
```

---

### 3. Lỗi khi email đã tồn tại

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "account": "newaccount",
    "email": "admin@example.com",
    "password": "123456"
  }'
```

**Response lỗi (409 Conflict):**
```json
{
  "statusCode": 409,
  "message": "Email đã được sử dụng"
}
```

---

### 4. Lỗi validation

```bash
# Mật khẩu quá ngắn (< 6 ký tự)
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "account": "testuser",
    "email": "test@example.com",
    "password": "123"
  }'
```

**Response lỗi (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": [
    "password must be longer than or equal to 6 characters"
  ],
  "error": "Bad Request"
}
```

```bash
# Email không hợp lệ
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "account": "testuser",
    "email": "invalid-email",
    "password": "123456"
  }'
```

**Response lỗi (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": [
    "email must be an email"
  ],
  "error": "Bad Request"
}
```

---

## 🔐 Đăng nhập sau khi đăng ký

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "account": "testuser",
    "password": "123456"
  }'
```

**Response:**
```json
{
  "statusCode": 201,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 5,
      "account": "testuser",
      "email": "testuser@example.com",
      "profile_image": null,
      "is_first_login": true,
      "create_at": "2025-11-30T12:00:00.000Z",
      "role": "user"
    },
    "expiresAt": "2025-12-30T12:00:00.000Z"
  }
}
```

---

## 🧪 VS Code REST Client

Tạo file `auth-test.http`:

```http
### Variables
@baseUrl = http://localhost:3000
@token = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

### 1. Đăng ký tài khoản mới
POST {{baseUrl}}/auth/register
Content-Type: application/json

{
  "account": "testuser123",
  "email": "testuser123@example.com",
  "password": "123456"
}

### 2. Đăng nhập với tài khoản vừa tạo
POST {{baseUrl}}/auth/login
Content-Type: application/json

{
  "account": "testuser123",
  "password": "123456"
}

### 3. Đăng ký lỗi - tài khoản đã tồn tại
POST {{baseUrl}}/auth/register
Content-Type: application/json

{
  "account": "admin",
  "email": "newemail@example.com",
  "password": "123456"
}

### 4. Đăng ký lỗi - email đã tồn tại
POST {{baseUrl}}/auth/register
Content-Type: application/json

{
  "account": "newaccount",
  "email": "admin@example.com",
  "password": "123456"
}

### 5. Đăng ký lỗi - validation
POST {{baseUrl}}/auth/register
Content-Type: application/json

{
  "account": "test",
  "email": "invalid-email",
  "password": "123"
}
```

---

## 📊 Quy trình đăng ký & đăng nhập hoàn chỉnh

```bash
#!/bin/bash

# 1. Đăng ký tài khoản
echo "=== Đăng ký tài khoản ==="
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "account": "demouser",
    "email": "demouser@example.com",
    "password": "123456"
  }')

echo $REGISTER_RESPONSE | jq .

# 2. Đăng nhập với tài khoản vừa tạo
echo -e "\n=== Đăng nhập ==="
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "account": "demouser",
    "password": "123456"
  }')

echo $LOGIN_RESPONSE | jq .

# 3. Lấy access token
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')
echo -e "\n=== Access Token ==="
echo $TOKEN

# 4. Test với token (ví dụ: lấy thông tin user)
echo -e "\n=== Test API với token ==="
curl -s http://localhost:3000/user/me \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## ⚠️ Validation Rules

| Field | Rules |
|-------|-------|
| **account** | Required, String, Unique |
| **email** | Required, Valid email format, Unique |
| **password** | Required, Min 6 characters |

---

## 🔒 Security Features

- ✅ **Password Hashing**: Sử dụng bcrypt với salt 10
- ✅ **Unique Validation**: Kiểm tra account và email đã tồn tại
- ✅ **Error Messages**: Thông báo lỗi rõ ràng bằng tiếng Việt
- ✅ **Default Role**: Tự động gán role "USER" cho tài khoản mới
- ✅ **First Login Flag**: Đánh dấu is_first_login = true
- ✅ **Input Validation**: Class-validator kiểm tra tất cả đầu vào

---

## 📝 Response Status Codes

| Code | Meaning | When |
|------|---------|------|
| **201** | Created | Đăng ký thành công |
| **400** | Bad Request | Validation failed (email format, password length) |
| **409** | Conflict | Account hoặc email đã tồn tại |
| **500** | Internal Server Error | Lỗi server |

---

## 🎯 Testing Checklist

- [x] Đăng ký với account, email, password
- [x] Kiểm tra account đã tồn tại
- [x] Kiểm tra email đã tồn tại
- [x] Validation password < 6 ký tự
- [x] Validation email không hợp lệ
- [x] Đăng nhập sau khi đăng ký
- [x] Kiểm tra password đã được hash
- [x] Kiểm tra role mặc định = "USER"
- [x] Kiểm tra is_first_login = true

---

*Created: November 30, 2025*
