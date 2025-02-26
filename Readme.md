# Open-Source Media Backend (Development in progress)

This is an open-source backend solution for building a media platform like YouTube, designed to handle video uploading, storage, streaming, and user authentication. Built with **Node.js**, **Express**, **PostgreSQL**, and **Cloudinary**, this backend system provides essential features for managing and serving media content at scale.
## Key Features

- **Video Upload and Storage**: Upload and store video files on Cloudinary.
- **Image Storage**: Store images (thumbnails, profile pictures, etc.) on Cloudinary.
- **Database Integration**: Uses PostgreSQL to manage video metadata.
- **User Authentication**: Supports user registration, login, using JWT.
- **Otp and Email based Authentication**: Otp and email based authentication for password reset.
- **Admin controllers**: Configured controllers for admin for secured management.
- **Scalable Architecture**: Built with scalability in mind to support high traffic and easy expansion.
## Tech Stack

- **Node.js**: JavaScript runtime for building a fast, scalable backend.
- **Express**: Web framework for building the API and handling server-side logic.
- **PostgreSQL**: Relational database to store user and video data.
- **Cloudinary**: Cloud storage service for managing and serving media files (images and videos).
- **JWT/Session Authentication**: Secure authentication for user management.
## Installation and Setup

To get started with the project, follow these steps:

### 1. Clone the repository

Start by cloning the project repository to your local machine:

```bash
git clone https://github.com/sahanse/open-media-se
```

### 2.Get into the Repository

```bash
cd open-media-se
```

### 3. Install Dependencies

Install the necessary dependencies using npm:


```bash
npm Install
```
## 4. Set up the PostgreSQL Database

To set up the PostgreSQL database for this project, follow the steps below:

### 4.1. Create a PostgreSQL Database

First, you need to create a new database in PostgreSQL. You can do this with the following SQL command:

```sql
CREATE DATABASE yout_db_name;

```
### 4.2. Database Schema

Schema Diagram:- https://asset.cloudinary.com/dsdksm8pj/019b7dc29c4e3c6eefafca60556a8fff

Below is the SQL schema to create the required tables for users, videos, and other necessary data. Run these SQL statements to create the necessary tables:

SQL schema:- https://asset.cloudinary.com/dsdksm8pj/6f1b709fc43d395b60d916e702e5f665

## 5.Configure `.env` File

To configure the necessary credentials for your project, you need to create an **.env** file in the root of your project directory. This file will store sensitive information such as your database credentials, Cloudinary API keys, and JWT secret.

5.1. **Create the `.env` file**:
   In the root directory of your project, create a new file named `.env`.

5.2. **Copy the contents from the `.env.sample` file**:
   This project includes an example `.env.sample` file. Copy the contents of the **.env.sample** file into your newly created **.env** file.

5.3. **Replace the placeholders**:
   Update the placeholders in the `.env` file with your own credentials:

## 6. Set up Cloudinary

To integrate Cloudinary for media management in your project, follow these steps:

### 1. Create a Cloudinary Account

- Sign up for a free Cloudinary account at [Cloudinary](https://cloudinary.com/). :contentReference[oaicite:0]{index=0}

### 2. Retrieve Cloudinary Credentials

After signing up, obtain your Cloudinary credentials:

- **Cloud Name**: Located in your Cloudinary Dashboard under "Account Details."
- **API Key and API Secret**: Navigate to the "API Keys" section in your Cloudinary Console Settings to find these credentials. :contentReference[oaicite:1]{index=1}

### 3. Configure Cloudinary in `.env` File

Replace the `.env` credentilas of cloudinary with your one   

## 6. Start the server 
Once everything is set up, you can start the server:
```bash
npm run dev

```
## 6. postman collection 
Below is the link of posman collection consisting all endpoints:-

collection link:-https://asset.cloudinary.com/dsdksm8pj/d330115ca801dc4b4a1c3c21474cc996
```

## License

```markdown
## License

This project is licensed under the [GNU Affero General Public License v3.0](https://www.gnu.org/licenses/agpl-3.0.html) with an additional **non-commercial use clause**. Commercial use is only permitted if the resulting work remains open-source and licensed under the same AGPL terms.

```

## Contributing

We welcome contributions to improve this project! To contribute:

1. Fork the repository.
2. Create a new branch: `git checkout -b feature-name`.
3. Commit your changes: `git commit -am 'Add new feature'`.
4. Push to your branch: `git push origin feature-name`.
5. Open a pull request to submit your changes.

## Contact

For any questions, feel free to open an issue or contact the maintainers at sahanshetty82@gmail.com.

### Acknowledgments

- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [PostgreSQL](https://www.postgresql.org/)
- [Cloudinary](https://cloudinary.com/)

