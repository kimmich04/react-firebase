**Note:** Since Firebase Dynamic Links shut down on August 25, 2025, the *email verification* feature does not function correctly on the deployed site. Current version of the web application does not use that feature.

Web link: https://first-project-2b259.web.app

Test account:

user1: bidder@gmail.com

password: 123456

user2: bidder2@gmail.com

password: 123456

## 🎥 Demo Videos

### Login and Create Auction

[![Watch the demo](https://img.youtube.com/vi/Y7unFiXQl6I/0.jpg)](https://www.youtube.com/watch?v=Y7unFiXQl6I)

*Shows user registration and login, then creating and publishing a new auction with product details and starting price.*

---

### Start Bidding, Notifications

[![Watch the demo](https://img.youtube.com/vi/tZBjsTnsr5w/0.jpg)](https://www.youtube.com/watch?v=tZBjsTnsr5w)

*Demonstrates how a bidder joins an ongoing auction and places bids while the system updates the current highest price in real time.*


# React Firebase Auction App (MVP)
---

## 📌 Overview

This project is a **Minimum Viable Product (MVP)** online auction web application built using **ReactJS** and **Firebase**.
The system allows users to register accounts, create auctions, manage auctions, and participate as bidders.

Repository: https://github.com/kimmich04/react-firebase

---

## 🧰 Tech Stack

* ReactJS
* Firebase v9 (Authentication, Firestore, Storage)
* Material UI Icons
* Emotion (React styling)
* FontAwesome
* Node.js + npm

---

## 🚀 Getting Started

### 1. Development Environment

Install the following software before running the project:

* Node.js (LTS recommended)
* npm (comes with Node.js)
* Git
* Visual Studio Code (recommended)

---

### 2. Clone the Project

Create an empty folder and open a terminal inside it:

```bash
git clone https://github.com/kimmich04/react-firebase.git
cd react-firebase
```

---

### 3. Install Dependencies

Install required libraries:

```bash
npm install @mui/icons-material
npm install @emotion/styled
npm install @emotion/react
npm install firebase@9.8.4
npm install @fortawesome/fontawesome-free
```

---

### 4. Run the Application

Start the development server:

```bash
npm start
```

Open in browser:

```
http://localhost:3000
```

---

## 👤 Authentication

Both **auctioneers** and **bidders** are treated as users.
An account is required to interact with the system.

### Register

1. Click **Sign Up** (top-right corner)
2. Fill required information:

   * Username
   * Full name
   * Email
   * Password
3. After registration, the login window will appear automatically.

### Login

Enter email and password to access the application.

---

## 📦 Auction System (CRUD Features)

### Create Auction

1. Click **Create Auction** on the navigation bar
2. Provide auction details:

   * Auction name
   * Product
   * Time
   * Starting price
3. Click **Publish** to create the auction

---

### View Auctions

**Home Page**

* Click the website logo
* Displays all upcoming and ongoing auctions from all users

**My Auction Page**

* Click **My Auction**
* Displays auctions created by the current user

---

### Edit Auction

1. Go to **My Auction**
2. Click **Edit** on the selected auction
3. Modify the information
4. Click the **Green button** to save changes

⚠️ Auctions can only be edited before the auction start time (no changes allowed during bidding).

---

### Delete Auction

1. Go to **My Auction**
2. Click the **Red button**
3. The auction will be permanently removed

⚠️ Auctions cannot be modified or deleted once bidding has started.

---

## 📌 Notes

* Users must log in before creating or managing auctions
* Image upload uses Firebase Storage
* This project is an academic MVP and does not include payment processing or production-level security rules

---

## 📄 License

This project is for educational purposes only.
