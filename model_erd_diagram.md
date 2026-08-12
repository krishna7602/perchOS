# Perch Application Model Entity Relationship Diagram (ERD)

This document maps out the complete **Entity-Relationship Diagram (ERD)** for the **Perch** application models. The database is organized into 5 primary domain clusters:

1. **Tenant & Venue Hierarchy** (Restaurant, Branch)
2. **Staff & Auth Domain** (User, Attendance)
3. **Menu Subsystem** (MenuItem, ItemVariant)
4. **Orders & Payments Subsystem** (Order, OrderLine, OrderEvent, Payment)
5. **Customer Networking & Chat Subsystem** (CustomerAccount, CustomerProfile, Connection, ConnectionRequest, DirectMessage, VenueChatMessage, VenuePoll)

---

## 1. Master System ERD Diagram

Below is the complete Mermaid ERD showing how entities are linked together through primary and foreign keys:

```mermaid
erDiagram
    %% TENANT & VENUE HIERARCHY
    RESTAURANT ||--|{ BRANCH : "owns (1:N)"
    RESTAURANT ||--|{ USER : "employs (1:N)"
    BRANCH ||--|{ USER : "assigns (1:N)"

    %% STAFF & ATTENDANCE
    USER ||--|{ ATTENDANCE : "clocks (1:N)"
    USER ||--o{ ORDER : "prepares/delivers (1:N)"

    %% MENU SUBSYSTEM
    BRANCH ||--|{ MENU_ITEM : "serves (1:N)"
    MENU_ITEM ||--|{ ITEM_VARIANT : "contains embedded (1:N)"

    %% ORDERS & PAYMENTS
    BRANCH ||--|{ ORDER : "receives (1:N)"
    ORDER ||--|{ ORDER_LINE : "contains embedded (1:N)"
    ORDER ||--|| PAYMENT : "has payment (1:1)"
    ORDER ||--|{ ORDER_EVENT : "logs audit trail (1:N)"
    MENU_ITEM ||--o{ ORDER_LINE : "referenced in (1:N)"

    %% CUSTOMER & NETWORKING
    CUSTOMER_ACCOUNT ||--|| CUSTOMER_PROFILE : "has profile (1:1)"
    BRANCH ||--o{ CUSTOMER_PROFILE : "currently checked into (1:N)"
    
    CUSTOMER_PROFILE ||--o{ CONNECTION_REQUEST : "sends (sender_id)"
    CUSTOMER_PROFILE ||--o{ CONNECTION_REQUEST : "receives (receiver_id)"
    CUSTOMER_PROFILE ||--o{ CONNECTION : "participant (user_a / user_b)"
    
    CONNECTION ||--|{ DIRECT_MESSAGE : "contains messages (1:N)"
    CUSTOMER_PROFILE ||--o{ DIRECT_MESSAGE : "sends DM"

    BRANCH ||--o{ VENUE_CHAT_MESSAGE : "hosts chat room (1:N)"
    CUSTOMER_PROFILE ||--o{ VENUE_CHAT_MESSAGE : "posts message (1:N)"
    
    BRANCH ||--o{ VENUE_POLL : "hosts poll (1:N)"
    CUSTOMER_PROFILE ||--o{ VENUE_POLL : "creates poll (1:N)"

    %% ENTITY DEFINITIONS & ATTRIBUTES
    RESTAURANT {
        ObjectId id PK
        string name
        string owner_id FK
        boolean is_active
        string razorpay_key_id
        string gst_number
    }

    BRANCH {
        ObjectId id PK
        ObjectId restaurant_id FK
        string name
        float lat
        float lng
        string qr_token
        string menu_qr_token
    }

    USER {
        ObjectId id PK
        string email
        string name
        ObjectId restaurant_id FK
        ObjectId branch_id FK
        Role role
        StaffStatus status
    }

    ATTENDANCE {
        ObjectId id PK
        ObjectId user_id FK
        ObjectId restaurant_id FK
        ObjectId branch_id FK
        datetime clock_in
        datetime clock_out
        int break_duration_minutes
    }

    MENU_ITEM {
        ObjectId id PK
        ObjectId restaurant_id FK
        ObjectId branch_id FK
        string name
        float price
        string category
        boolean is_veg
        boolean available
    }

    ITEM_VARIANT {
        string name
        float price
    }

    ORDER {
        ObjectId id PK
        ObjectId restaurant_id FK
        ObjectId branch_id FK
        OrderSource source
        string external_order_id
        string order_token
        string customer_handle
        string table_number
        float total
        string order_status
        string payment_status
        ObjectId assigned_chef_id FK
        ObjectId assigned_waiter_id FK
        object channel_metadata
    }

    ORDER_LINE {
        ObjectId menu_item_id FK
        string name
        string variant_name
        float price
        int quantity
    }

    ORDER_EVENT {
        ObjectId id PK
        ObjectId branch_id FK
        ObjectId order_id FK
        string event_type
        ObjectId performed_by_id FK
    }

    PAYMENT {
        ObjectId id PK
        ObjectId order_id FK
        ObjectId venue_id FK
        float amount
        string provider
        string status
    }

    CUSTOMER_ACCOUNT {
        ObjectId id PK
        string google_id
        string email
        boolean email_verified
    }

    CUSTOMER_PROFILE {
        ObjectId id PK
        ObjectId account_id FK
        string username
        string display_name
        ObjectId current_venue_id FK
        NetworkingMode networking_mode
        boolean is_visible
    }

    CONNECTION_REQUEST {
        ObjectId id PK
        ObjectId sender_id FK
        ObjectId receiver_id FK
        ObjectId venue_id FK
        WaveStatus status
    }

    CONNECTION {
        ObjectId id PK
        ObjectId user_a FK
        ObjectId user_b FK
        ObjectId venue_id FK
    }

    DIRECT_MESSAGE {
        ObjectId id PK
        ObjectId connection_id FK
        ObjectId sender_id FK
        string content
        boolean is_read
    }

    VENUE_CHAT_MESSAGE {
        ObjectId id PK
        ObjectId venue_id FK
        ObjectId sender_id FK
        string content
    }

    VENUE_POLL {
        ObjectId id PK
        ObjectId venue_id FK
        ObjectId creator_profile_id FK
        string question
        boolean is_active
    }
```

---

## 2. Model Relationship Breakdown by Domain

### A. Multi-Tenant Venue Hierarchy
* **`Restaurant` (1) $\rightarrow$ `Branch` (N)**: A single restaurant brand can operate multiple physical branches/venues.
* **`Branch` (1) $\rightarrow$ `User` (N)**: Staff members (managers, chefs, waiters) are assigned to specific branches.

### B. Kitchen & Order Execution
* **`Branch` (1) $\rightarrow$ `Order` (N)**: Orders are placed at specific venue branches.
* **`Order` (1) $\rightarrow$ `OrderLine` (N)**: Embedded list of purchased menu items inside the Order document.
* **`Order` (1) $\rightarrow$ `Payment` (1)**: Each order links to a transaction payment record (Razorpay, COD, etc.).
* **`Order` (1) $\rightarrow$ `OrderEvent` (N)**: Audit trail logging actions (e.g. `CHEF_ACCEPTED`, `WAITER_PICKUP`, `CASH_CONFIRMED`).

### C. Customer Presence & In-Venue Networking
* **`CustomerAccount` (1) $\rightarrow$ `CustomerProfile` (1)**: 1-to-1 account to public profile relationship.
* **`Branch` (1) $\rightarrow$ `CustomerProfile` (N)**: Tracks live customer check-ins via `current_venue_id`.
* **`CustomerProfile` $\rightarrow$ `ConnectionRequest` (Waves)**: Customer sends/receives wave connection requests inside a venue.
* **`Connection` (1) $\rightarrow$ `DirectMessage` (N)**: Once connected, two users exchange direct messages.
* **`Branch` (1) $\rightarrow$ `VenueChatMessage` (N)**: Public chat room for all customers checked into a specific branch.
