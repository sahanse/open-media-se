# Open-Source Media Backend (Development in progress)

This is an open-source backend solution for building a media platform like YouTube, designed to handle video uploading, storage, streaming, and user authentication. Built with **Node.js**, **Express**, **PostgreSQL**, and **Cloudinary**, this backend system provides essential features for managing and serving media content at scale.
## Key Features

- **Video Upload and Storage**: Upload and store video files on Cloudinary.
- **Image Storage**: Store images (thumbnails, profile pictures, etc.) on Cloudinary.
- **Database Integration**: Uses PostgreSQL to manage video metadata (titles, descriptions, views, likes, etc.).
- **User Authentication**: Supports user registration, login, using JWT.
- **Video Streaming**: Enables video streaming.
- **CRUD Operations for Media**: Create, Read, Update, and Delete (CRUD) functionality for video management.
- **Scalable Architecture**: Built with scalability in mind to support high traffic and easy expansion.
## Tech Stack

- **Node.js**: JavaScript runtime for building a fast, scalable backend.
- **Express**: Web framework for building the API and handling server-side logic.
- **PostgreSQL**: Relational database to store user and video data.
- **Cloudinary**: Cloud storage service for managing and serving media files (images and videos).
- **JWT/Session Authentication**: Secure authentication for user management.
- **Video Streaming**: Supports multiple video formats and resolutions for smooth playback.
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

Schema Diagram:- https://res.cloudinary.com/dsdksm8pj/image/upload/v1738074071/pcomwb2wfln4de4mstdo.png

Below is the SQL schema to create the required tables for users, videos, and other necessary data. Run these SQL statements to create the necessary tables:

```sql
-- Create "users" table
CREATE TABLE IF NOT EXISTS users (
    id serial PRIMARY KEY,
    fullname varchar(255) NOT NULL,
    username varchar(255) NOT NULL UNIQUE,
    email varchar(255) NOT NULL UNIQUE,
    password text NOT NULL,
    avatar text DEFAULT null,
    coverimage text DEFAULT null,
    ischannel boolean NOT NULL DEFAULT false,
    verified boolean NOT NULL DEFAULT false,
    refreshtoken text DEFAULT null,
    createdat timestamptz DEFAULT now(),
    updatedat timestamptz DEFAULT now()
);

-- Create "users" table
CREATE TABLE IF NOT EXISTS admin (
    id serial PRIMARY KEY,
    fullname varchar(255) NOT NULL,
    register_number VARCHAR NOT NULL UNIQUE,
    username varchar(255) NOT NULL UNIQUE,
    email varchar(255) NOT NULL UNIQUE,
    password text NOT NULL
);

-- Create "otp" table
CREATE TABLE IF NOT EXISTS admin_otp (
    id SERIAL PRIMARY KEY,
    fullname varchar(255) NOT NULL,
    register_number VARCHAR NOT NULL UNIQUE,
    otp VARCHAR NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL,
    expiry TIMESTAMPTZ NOT NULL
);

-- Create "topics" table
CREATE TABLE IF NOT EXISTS category(
    id serial PRIMARY KEY,
    title varchar(100) NOT NULL UNIQUE,
    description varchar(255),
    child_safe boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);



-- Create "video" table
CREATE TABLE IF NOT EXISTS video (
    id serial PRIMARY KEY,
    video_url text NOT NULL,
    thumbnail_url text,
    title varchar(300) NOT NULL,
    description varchar(500) NOT NULL,
    ispublic boolean NOT NULL DEFAULT false,
    duration_type varchar(10) NOT NULL,
    child_safe boolean NOT NULL DEFAULT true,
    category varchar(255),
    user_id bigint NOT NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT video_fk6 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT catgorypost_fk1 FOREIGN KEY (category) REFERENCES category(title) ON DELETE CASCADE
);

-- Create "video_likes" table with composite unique constraint
CREATE TABLE IF NOT EXISTS video_likes (
    id serial PRIMARY KEY,
    video_id bigint NOT NULL,
    user_id bigint NOT NULL,
    -- Add composite unique constraint
    CONSTRAINT unique_video_user UNIQUE (video_id, user_id),
    -- Foreign keys
    CONSTRAINT likes_fk1 FOREIGN KEY (video_id) REFERENCES video(id) ON DELETE CASCADE,
    CONSTRAINT likes_fk2 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create "comments" table
CREATE TABLE IF NOT EXISTS video_comments (
    id serial PRIMARY KEY,
    user_id bigint NOT NULL,
    video_id bigint NOT NULL,
    comment varchar(300) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT comments_fk1 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT comments_fk2 FOREIGN KEY (video_id) REFERENCES video(id) ON DELETE CASCADE
);

-- Create "views" table
CREATE TABLE IF NOT EXISTS video_views (
    id serial PRIMARY KEY,
    video_id bigint NOT NULL,
    user_id bigint,  -- Can be NULL if user is not logged in
    viewed_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT views_fk_video FOREIGN KEY (video_id) REFERENCES video(id) ON DELETE CASCADE,
    CONSTRAINT views_fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- Create "communitypost" table
CREATE TABLE IF NOT EXISTS post (
    id serial PRIMARY KEY,
    image_array text[],
    description varchar(255),
    ispublic boolean NOT NULL DEFAULT false,
    user_id bigint NOT NULL,
    child_safe boolean NOT NULL DEFAULT true,
    category varchar(255),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT communitypost_fk4 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT catgorypost_fk1 FOREIGN KEY (category) REFERENCES category(title) ON DELETE CASCADE
);


-- Create "likes" table with composite unique constraint
CREATE TABLE IF NOT EXISTS post_likes (
    id serial PRIMARY KEY,
    post_id bigint NOT NULL,
    user_id bigint NOT NULL,
    -- Add composite unique constraint
    CONSTRAINT unique_post_user UNIQUE (post_id, user_id),
    -- Foreign keys
    CONSTRAINT likes_fk1 FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE,
    CONSTRAINT likes_fk2 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create "comments" table
CREATE TABLE IF NOT EXISTS post_comments (
    id serial PRIMARY KEY,
    post_id bigint NOT NULL,
    user_id bigint NOT NULL,
    comment text NOT NULL, 
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT comments_fk1 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT comments_fk2 FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE
);

-- Create "views" table
CREATE TABLE IF NOT EXISTS post_views (
    id serial PRIMARY KEY,
    post_id bigint NOT NULL,
    user_id bigint,  -- Can be NULL if user is not logged in
    viewed_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT views_fk_video FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE,
    CONSTRAINT views_fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- Create "subscription" table
CREATE TABLE IF NOT EXISTS subscription (
    id serial PRIMARY KEY,
    subscribers_id bigint NOT NULL,
    subscribedto_id bigint NOT NULL,
    CONSTRAINT subscription_fk1 FOREIGN KEY (subscribers_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT subscription_fk2 FOREIGN KEY (subscribedto_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create "saved" table
CREATE TABLE IF NOT EXISTS saved_videos (
    id serial PRIMARY KEY,
    user_id bigint NOT NULL,
    video_id bigint NOT NULL,
    CONSTRAINT playlist_fk1 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT playlist_fk2 FOREIGN KEY (video_id) REFERENCES video(id) ON DELETE CASCADE
);

-- Create "otp" table
CREATE TABLE IF NOT EXISTS otp (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,  -- Change BIGINT to INTEGER
    otp VARCHAR NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL,
    expiry TIMESTAMPTZ NOT NULL,
    CONSTRAINT otp_fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- create "otpCounts" table
CREATE TABLE IF NOT EXISTS otpcounts (
    id SERIAL PRIMARY KEY,
    user_id bigint NOT NULL,
    otp_id bigint NOT NULL,
    date TIMESTAMPTZ NOT NULL, 
    count INTEGER NOT NULL DEFAULT 0, -- Stores the number of OTPs requested
    CONSTRAINT otpCounts_fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT otpCounts_fk_otp FOREIGN KEY (otp_id) REFERENCES otp(id) ON DELETE CASCADE
);


-- Create trigger function for users.updatedat
CREATE OR REPLACE FUNCTION update_users_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedat = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for users table
CREATE TRIGGER update_users_updatedat
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_users_modtime();

-- Create trigger function for video.updated_at
CREATE OR REPLACE FUNCTION update_video_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for video table
CREATE TRIGGER update_video_updated_at
BEFORE UPDATE ON video
FOR EACH ROW
EXECUTE FUNCTION update_video_modtime();

-- Create trigger function for video_comments.updated_at
CREATE OR REPLACE FUNCTION update_video_comments_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for video_comments table
CREATE TRIGGER update_video_comments_updated_at
BEFORE UPDATE ON video_comments
FOR EACH ROW
EXECUTE FUNCTION update_video_comments_modtime();

-- Create trigger function for post.updated_at
CREATE OR REPLACE FUNCTION update_post_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for post table
CREATE TRIGGER update_post_updated_at
BEFORE UPDATE ON post
FOR EACH ROW
EXECUTE FUNCTION update_post_modtime();

-- Create trigger function for post_comments.updated_at
CREATE OR REPLACE FUNCTION update_post_comments_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for post_comments table
CREATE TRIGGER update_post_comments_updated_at
BEFORE UPDATE ON post_comments
FOR EACH ROW
EXECUTE FUNCTION update_post_comments_modtime();

-- Create trigger function for category.updated_at
CREATE OR REPLACE FUNCTION update_category_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for category table
CREATE TRIGGER update_category_updated_at
BEFORE UPDATE ON category
FOR EACH ROW
EXECUTE FUNCTION update_category_modtime(); 


---create triiger to make sure only one user can make only 4 comment on a post
CREATE OR REPLACE FUNCTION enforce_post_comment_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM post_comments 
        WHERE user_id = NEW.user_id AND post_id = NEW.post_id) >= 4 THEN
        RAISE EXCEPTION 'Users can only post up to 4 comments per post.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_comment_limit_trigger
BEFORE INSERT ON post_comments
FOR EACH ROW EXECUTE FUNCTION enforce_post_comment_limit();

---create trigger to make sure one user can make only 4 comment on a video
CREATE OR REPLACE FUNCTION enforce_video_comment_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM video_comments 
        WHERE user_id = NEW.user_id AND video_id = NEW.video_id) >= 4 THEN
        RAISE EXCEPTION 'Users can only post up to 4 comments per video.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER video_comment_limit_trigger
BEFORE INSERT ON video_comments
FOR EACH ROW EXECUTE FUNCTION enforce_video_comment_limit();

--add pgterm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

```
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

