# Daily Expense Tracker

A personal finance web application built with vanilla HTML, CSS, and JavaScript featuring a Midnight Teal glassmorphism interface, JWT-style session authentication, income and expense tracking, custom category management, monthly category budgets with live threshold alerts, multi-criteria filtering, and interactive Chart.js analytics.

---

## Features

- **User Authentication & Session Management**
  - Register, login, and logout flows with password visibility toggles.
  - Generates a base64-encoded session token (`header.payload.signature`) with 24-hour expiry and isolates transactions, custom categories, and budgets per user in `localStorage`.
- **Income & Expense Logging**
  - Unified transaction entry form with instant switching between **Expense** and **Income** modes.
  - Includes **Amount (`₹`)**, **Category**, **Interactive Calendar Date Picker** (with one-click **Today** and **Yesterday** chips), and **Note** fields.
- **Custom Category Management**
  - Predefined categories separated by transaction type (`Food & Dining`, `Transport`, `Shopping`, `Bills & Utilities`, `Entertainment`, `Education`, `Salary`, `Allowance`, `Freelance`, `Scholarship`, `Gift`, `Other`).
  - Add or remove custom categories dynamically per account.
- **Dashboard Overview & Visual Analytics**
  - Monthly KPI summary cards displaying **This Month Spend**, **Total Earned**, **Savings (Net Balance)**, and **Top Category**.
  - Interactive **Spending by Category Pie Chart** powered by Chart.js, dynamically synced to the selected month.
- **Monthly Category Budgets & Threshold Alerts**
  - Set and remove monthly spending limits per expense category with live **Spent vs. Limit** progress bars.
  - Visual alerts automatically trigger when spending reaches **80% (Near Limit)** or exceeds **100% (Over Limit)** of a category's monthly budget.
- **Transaction Table, Multi-Filters & Safe Deletion**
  - Date-sorted transaction table supporting inline modal **Editing** and **Deletion** with a custom confirmation dialog.
  - Filter transactions simultaneously by **Date Range** (`From` – `To`), **Type** (`All` / `Expense` / `Income`), and **Category**.

---

## Tech Stack

- **Frontend:** HTML5, CSS3 (Glassmorphism UI, CSS Grid/Flexbox, Custom Properties)
- **Logic & State:** Vanilla JavaScript (ES6+), `localStorage` persistence
- **Data Visualization:** [Chart.js v4.4.1](https://www.chartjs.org/) (via CDN)

---

## Project Structure

```text
daily-expense-tracker/
├── index.html      # Application views (Auth, Navbar, Split Dashboard, Edit & Confirm Modals)
├── style.css       # Midnight Teal glassmorphism styling, responsive layout, and alerts
├── script.js       # AuthService, user-scoped DataStore, Chart.js integration, and UI controllers
└── README.md       # Project documentation