# Library Management System

A learning project for building a small, service-oriented library
management system using **JavaScript, Node.js, REST, gRPC, MySQL, and
Sequelize ORM**.

The project is designed to teach how a REST API Gateway communicates
with backend services over gRPC, how services separate responsibilities,
and how database schemas are managed through Sequelize models and
migrations.

> **Project status:** Initial folder structure created. Implementation
> has not started. This README describes the planned architecture and
> development approach; it is not a claim that the system is already
> implemented.

------------------------------------------------------------------------

## 1. Objectives

The main objectives are to:

1.  Build a working library system for managing books, members,
    borrowing, and returns.
2.  Learn how an API Gateway exposes REST endpoints to a client.
3.  Learn how backend services communicate through gRPC and Protocol
    Buffers.
4.  Separate HTTP handling, gRPC handlers, business logic, and database
    access.
5.  Use Sequelize ORM for all application database operations.
6.  Define and evolve database schemas through Sequelize migrations.
7.  Keep each service responsible for its own data.
8.  Test the system incrementally, from individual services to complete
    workflows.

### Planned user capabilities

-   Add, view, update, list, and remove books, subject to borrowing and
    data-integrity rules.
-   Register and view library members.
-   Borrow an available book.
-   Return a borrowed book.
-   View borrowing records and borrowing history.
-   Receive useful errors when a book is unavailable or a request is
    invalid.

The exact rules for borrowing limits, overdue loans, and book deletion
will be finalized before implementing those workflows.

------------------------------------------------------------------------

## 2. Technology stack

  -----------------------------------------------------------------------
  Area                    Technology              Purpose
  ----------------------- ----------------------- -----------------------
  Language                JavaScript              Application code

  Runtime                 Node.js                 Runs the gateway and
                                                  services

  Client-facing API       REST over HTTP          Lets a frontend or API
                                                  client use the system

  Internal communication  gRPC                    Lets backend services
                                                  call each other

  Service contracts       Protocol Buffers        Defines gRPC methods
                          (`.proto`)              and message structures

  Database                MySQL                   Persistent storage

  ORM                     Sequelize               Defines models and
                                                  performs database
                                                  operations

  Schema management       Sequelize CLI           Creates and changes
                          migrations              database tables in a
                                                  repeatable way

  REST testing            Postman or equivalent   Tests HTTP endpoints

  gRPC testing            A dedicated test client Tests service methods
                          or suitable gRPC tool   
  -----------------------------------------------------------------------

### Database rule

Application code will use Sequelize methods such as `create`,
`findByPk`, `findAll`, `update`, and `destroy`. Table creation and
schema changes will be defined in Sequelize migrations.

Sequelize generates SQL internally, but we will not manually write SQL
queries as the application's database-access approach.

------------------------------------------------------------------------

## 3. System architecture

The system will contain three Node.js applications:

1.  **API Gateway** --- accepts REST/HTTP requests from the client and
    forwards them to backend services using gRPC.
2.  **Book Service** --- owns book data and book-related business rules.
3.  **Borrowing Service** --- owns member and borrowing data, applies
    borrowing rules, and calls the Book Service when it needs book
    information or availability.

``` mermaid
flowchart TB
    CLIENT["Frontend / REST Client"]

    subgraph GATEWAY["API Gateway — Node.js"]
        ROUTES["REST Routes"]
        CONTROLLERS["HTTP Controllers"]
        CLIENTS["gRPC Clients"]
        ROUTES --> CONTROLLERS
        CONTROLLERS --> CLIENTS
    end

    subgraph BOOK["Book Service — Node.js"]
        BOOKSERVER["gRPC Server"]
        BOOKHANDLERS["Book RPC Handlers"]
        BOOKLOGIC["Book Business Logic"]
        BOOKORM["Sequelize Models / ORM"]
        BOOKSERVER --> BOOKHANDLERS
        BOOKHANDLERS --> BOOKLOGIC
        BOOKLOGIC --> BOOKORM
    end

    subgraph BORROW["Borrowing Service — Node.js"]
        BORROWSERVER["gRPC Server"]
        BORROWHANDLERS["Borrowing RPC Handlers"]
        BORROWLOGIC["Borrowing Business Logic"]
        BOOKCLIENT["Book Service gRPC Client"]
        BORROWORM["Sequelize Models / ORM"]
        BORROWSERVER --> BORROWHANDLERS
        BORROWHANDLERS --> BORROWLOGIC
        BORROWLOGIC --> BOOKCLIENT
        BORROWLOGIC --> BORROWORM
    end

    subgraph DB["MySQL"]
        BOOKDB[("library_books")]
        BORROWDB[("library_borrowings")]
    end

    CLIENT -->|"HTTP / REST"| ROUTES
    CLIENTS -->|"gRPC"| BOOKSERVER
    CLIENTS -->|"gRPC"| BORROWSERVER
    BOOKCLIENT -->|"gRPC"| BOOKSERVER
    BOOKORM --> BOOKDB
    BORROWORM --> BORROWDB

    BOOKPROTO["proto/book.proto"] -. "defines Book API" .-> BOOKSERVER
    BORROWPROTO["proto/borrowing.proto"] -. "defines Borrowing API" .-> BORROWSERVER
```

### Request flow

For a borrowing request:

1.  The client sends an HTTP request to the API Gateway.
2.  A REST route directs the request to its controller.
3.  The controller validates the request shape and calls the Borrowing
    Service through gRPC.
4.  The Borrowing Service applies the borrowing rules and asks the Book
    Service to check the book.
5.  The Book Service uses Sequelize to retrieve the relevant book data.
6.  If the operation is permitted, the Borrowing Service records the
    transaction through Sequelize.
7.  The result travels back through gRPC to the Gateway.
8.  The Gateway returns an appropriate HTTP response to the client.

The borrowing workflow must be designed to handle concurrent requests so
that two requests cannot both successfully claim the same final
available copy.

------------------------------------------------------------------------

## 4. Service responsibilities

### 4.1 API Gateway

**Responsibilities** - Expose REST endpoints. - Parse and validate
incoming HTTP requests. - Call the appropriate backend service through
gRPC. - Translate backend responses and errors into suitable HTTP status
codes and response bodies. - Keep service addresses and configuration
outside business logic.

**Must not** - Connect directly to either service database. - Implement
book or borrowing business rules. - Bypass a service to modify its data.

### 4.2 Book Service

**Responsibilities** - Add and retrieve books. - List books and
available books. - Update book details and inventory counts. - Apply
rules for changes or removal of books. - Own the book database,
Sequelize models, and migrations. - Expose its operations through the
gRPC API defined in `proto/book.proto`.

### 4.3 Borrowing Service

**Responsibilities** - Register and retrieve library members. - Create
borrowing records and process returns. - Preserve borrowing history. -
Validate borrowing requests. - Call the Book Service over gRPC when book
data or availability is needed. - Own the member and borrowing database,
Sequelize models, and migrations. - Expose its operations through the
gRPC API defined in `proto/borrowing.proto`.

The Borrowing Service must not query or modify the Book Service's
database directly.

------------------------------------------------------------------------

## 5. Planned data model

The initial design uses three entities across two service-owned
databases.

### 5.1 `Book` --- Book Service database

Database: `library_books`

  -----------------------------------------------------------------------
  Attribute               Proposed type           Rules / purpose
  ----------------------- ----------------------- -----------------------
  `id`                    Integer                 Primary key

  `title`                 String                  Required

  `author`                String                  Required

  `isbn`                  String                  Optional or unique when
                                                  provided; final rule to
                                                  be confirmed

  `totalCopies`           Integer                 Total copies owned;
                                                  must not be negative

  `availableCopies`       Integer                 Copies currently
                                                  available; must be
                                                  between zero and
                                                  `totalCopies`

  `createdAt`             Date                    Managed by Sequelize

  `updatedAt`             Date                    Managed by Sequelize
  -----------------------------------------------------------------------

Additional constraints and validation will be implemented through
Sequelize model definitions, migrations, and business logic as
appropriate.

### 5.2 `Member` --- Borrowing Service database

Database: `library_borrowings`

  Attribute     Proposed type   Rules / purpose
  ------------- --------------- ---------------------------------
  `id`          Integer         Primary key
  `name`        String          Required
  `email`       String          Required; intended to be unique
  `createdAt`   Date            Managed by Sequelize
  `updatedAt`   Date            Managed by Sequelize

### 5.3 `Borrowing` --- Borrowing Service database

Database: `library_borrowings`

  -----------------------------------------------------------------------
  Attribute               Proposed type           Rules / purpose
  ----------------------- ----------------------- -----------------------
  `id`                    Integer                 Primary key

  `memberId`              Integer                 References a member in
                                                  the same database

  `bookId`                Integer                 Identifies a book owned
                                                  by the Book Service

  `borrowedAt`            Date                    When the book was
                                                  borrowed

  `dueAt`                 Date                    Expected return date;
                                                  policy to be finalized

  `returnedAt`            Date or null            Null while the book has
                                                  not been returned

  `status`                Enum or constrained     Planned values:
                          string                  `BORROWED`, `RETURNED`

  `createdAt`             Date                    Managed by Sequelize

  `updatedAt`             Date                    Managed by Sequelize
  -----------------------------------------------------------------------

### Relationships

-   One `Member` can have many `Borrowing` records.
-   Each `Borrowing` record belongs to one `Member`.
-   Each `Borrowing` record references one `Book` by `bookId`.
-   A book can appear in many borrowing records over time.

The `Member`--`Borrowing` relationship can use a Sequelize association
and a database foreign key because both tables belong to the same
database.

The `bookId` field is **not** a cross-database foreign key. The
Borrowing Service validates book references through the Book Service's
gRPC API. This preserves service ownership.

### Business rules to finalize

Before implementing borrowing, decide: - The maximum number of books a
member may borrow at once. - The loan duration and due-date rules. -
Whether overdue loans are supported in the first release. - Whether
books with active borrowing records can be removed. - How book
availability is updated safely when concurrent borrowing or return
requests occur.

------------------------------------------------------------------------

## 6. Planned gRPC contracts

The `.proto` files define the operations and message formats available
to other applications. The final method names and request/response
messages will be designed before service implementation.

### Book API --- planned operations

-   `AddBook`
-   `GetBook`
-   `ListBooks`
-   `ListAvailableBooks`
-   `UpdateBook`
-   `RemoveBook`

### Borrowing API --- planned operations

-   `RegisterMember`
-   `GetMember`
-   `BorrowBook`
-   `ReturnBook`
-   `GetBorrowing`
-   `ListMemberBorrowings`

The API Gateway will use gRPC clients generated or loaded from these
contracts. The Borrowing Service will also use a gRPC client for the
Book Service.

------------------------------------------------------------------------

## 7. Planned REST API

The exact endpoint list will be finalized alongside the `.proto`
contracts. A possible initial REST interface is:

  -------------------------------------------------------------------------------
  Method                  Endpoint                        Purpose
  ----------------------- ------------------------------- -----------------------
  `POST`                  `/api/books`                    Add a book

  `GET`                   `/api/books`                    List books

  `GET`                   `/api/books/available`          List available books

  `GET`                   `/api/books/:id`                Retrieve one book

  `PATCH`                 `/api/books/:id`                Update book details

  `DELETE`                `/api/books/:id`                Request book removal

  `POST`                  `/api/members`                  Register a member

  `GET`                   `/api/members/:id`              Retrieve a member

  `POST`                  `/api/borrowings`               Borrow a book

  `POST`                  `/api/borrowings/:id/return`    Return a borrowed book

  `GET`                   `/api/borrowings/:id`           Retrieve a borrowing
                                                          record

  `GET`                   `/api/members/:id/borrowings`   List a member's
                                                          borrowing history
  -------------------------------------------------------------------------------

These are proposed endpoints, not implemented routes. The final design
may change after validating the service contracts and business rules.

------------------------------------------------------------------------

## 8. Project structure

The initial directory skeleton is:

``` text
library-management/
├── api-gateway/
│   ├── server.js
│   ├── routes/
│   ├── controllers/
│   ├── clients/
│   └── config/
│
├── services/
│   ├── book-service/
│   │   ├── server.js
│   │   ├── handlers/
│   │   ├── services/
│   │   ├── models/
│   │   ├── migrations/
│   │   └── config/
│   │
│   └── borrowing-service/
│       ├── server.js
│       ├── handlers/
│       ├── services/
│       ├── clients/
│       ├── models/
│       ├── migrations/
│       └── config/
│
├── proto/
│   ├── book.proto
│   └── borrowing.proto
│
├── package.json
├── .env.example
└── .gitignore
```

Additional files, such as individual model files, migration files,
tests, and shared configuration, will be added when their
responsibilities are defined. The structure may be refined if
implementation reveals a clear need.

------------------------------------------------------------------------

## 9. Database and migration strategy

We will use one MySQL server with two separate databases initially:

-   `library_books`
-   `library_borrowings`

Each service will have its own Sequelize configuration and migration
history.

The workflow will be:

1.  Define Sequelize models and their attributes.
2.  Create migrations to establish the schema.
3.  Run migrations using Sequelize CLI.
4.  Verify the resulting tables and constraints.
5.  Make future schema changes through new migrations.
6.  Use Sequelize model methods for application reads and writes.

We will not use `sequelize.sync()` as the normal schema-management
strategy. Migrations provide a versioned, repeatable record of database
changes.

Environment variables will hold database credentials and service
configuration. Real credentials should not be committed to version
control.

------------------------------------------------------------------------

## 10. Development plan

### Phase 1 --- Architecture and requirements

-   Validate service boundaries and responsibilities.
-   Finalize entity attributes, relationships, and constraints.
-   Confirm borrowing, return, and availability rules.
-   Design REST endpoints and gRPC contracts.

**Deliverable:** Approved architecture, data model, and API
specifications.

### Phase 2 --- Project and database setup

-   Configure Node.js dependencies.
-   Configure Sequelize for each service.
-   Create models and migrations.
-   Create the two MySQL databases.
-   Run migrations and verify the schema.

**Deliverable:** Working database layer with version-controlled schemas.

### Phase 3 --- Book Service

-   Implement the Book Service gRPC server.
-   Implement handlers and business logic.
-   Use Sequelize for all book data operations.
-   Test the Book Service independently.

**Deliverable:** Tested gRPC operations for books.

### Phase 4 --- Borrowing Service

-   Implement member and borrowing models.
-   Implement borrowing and return rules.
-   Add the Book Service gRPC client.
-   Handle unavailable books, invalid requests, and service failures.
-   Test the borrowing workflow, including concurrent requests.

**Deliverable:** Tested borrowing workflows.

### Phase 5 --- API Gateway

-   Implement REST routes and controllers.
-   Configure gRPC clients for both services.
-   Translate gRPC results and errors into appropriate HTTP responses.
-   Test the REST API with Postman.

**Deliverable:** REST interface to the backend services.

### Phase 6 --- End-to-end validation

-   Add books and members.
-   Borrow and return books through REST endpoints.
-   Verify records through application-level checks and Sequelize.
-   Test invalid IDs, unavailable books, repeated returns, and service
    failures.
-   Verify that borrowing history is preserved.

**Deliverable:** A working, tested Library Management System.

### Phase 7 --- Optional improvements

Potential additions after the core system works: - Authentication and
authorization. - Overdue-loan handling. - Automated tests. - Structured
logging and request tracing. - Docker-based local development. - A
frontend interface.

These improvements are not part of the initial implementation unless
explicitly added to scope.

------------------------------------------------------------------------

## 11. Engineering principles

-   **JavaScript only:** No TypeScript for this project.
-   **ORM-based persistence:** Use Sequelize for application database
    operations.
-   **Migration-based schemas:** Use Sequelize migrations to create and
    evolve tables.
-   **Service ownership:** A service accesses only the database it owns.
-   **Clear layers:** Keep transport handlers separate from business
    logic and persistence.
-   **Contract-first communication:** Define gRPC messages and methods
    before implementing callers and servers.
-   **Incremental development:** Implement and test one layer at a time.
-   **No premature complexity:** Build the core flow before adding
    optional infrastructure.
-   **Data integrity:** Validate identifiers, borrowing state,
    availability, and concurrent operations.

------------------------------------------------------------------------

## 12. Definition of done

The initial system will be considered complete when:

-   The two databases can be created and upgraded through migrations.
-   Book operations work through the Book Service.
-   Member registration and borrowing records work through the Borrowing
    Service.
-   The Borrowing Service communicates with the Book Service using gRPC.
-   The API Gateway exposes the agreed REST endpoints.
-   A client can complete a borrow-and-return workflow through REST.
-   Invalid requests return meaningful errors.
-   Borrowing history remains available after a return.
-   Book availability remains consistent under the defined business
    rules.
-   No service directly accesses another service's database.

------------------------------------------------------------------------

## Current status

-   [x] Initial project directory structure created
-   [ ] Business rules finalized
-   [ ] Data model and relationships finalized
-   [ ] REST and gRPC contracts finalized
-   [ ] Sequelize configuration completed
-   [ ] Migrations created and verified
-   [ ] Book Service implemented and tested
-   [ ] Borrowing Service implemented and tested
-   [ ] API Gateway implemented and tested
-   [ ] End-to-end workflow validated
