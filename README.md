# Smart Parking System

A web-based Smart Parking System that allows users to register, log in, and book parking slots online. The application integrates secure authentication, dynamic slot management, and secure payments via Razorpay.

## Features

- **User Authentication:** Secure signup and login using JWT and Bcrypt.
- **Dashboard:** A dynamic user dashboard to view and manage bookings.
- **Slot Booking:** Real-time checking and booking of available parking slots.
- **Payment Integration:** Secure checkout using Razorpay for seamless transactions.
- **Responsive UI:** Clean, responsive front-end built with HTML, CSS, and Vanilla JavaScript.

## Technology Stack

### Backend
- **Node.js** & **Express.js** for the server framework.
- **MongoDB** & **Mongoose** for data storage and modeling.
- **JSON Web Tokens (JWT)** for stateless authentication.
- **Bcryptjs** for password hashing.
- **Razorpay** for handling online payments.

### Frontend
- **HTML5 & CSS3**
- **JavaScript (Vanilla)**

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (Local or Atlas cluster)
- Razorpay Account (for payment API keys)

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/road2tec/Number-plate-.git
   cd Number-plate-
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add your credentials:
   ```env
   PORT=4000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   ```

4. **Start the server:**
   ```bash
   npm run dev
   # or
   npm start
   ```

5. **Access the application:**
   Open your browser and navigate to `http://localhost:4000` (or whatever port you specified).

## License

ISC License
