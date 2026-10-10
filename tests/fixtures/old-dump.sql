PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE `group` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`gradient_index` integer DEFAULT 0 NOT NULL,
	`parent_id` text DEFAULT '' NOT NULL,
	`sort_index` integer DEFAULT 100 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE `oauth_account` (
	`provider` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL
);
CREATE TABLE `save` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`favicon_url` text DEFAULT '' NOT NULL,
	`gradient_index` integer DEFAULT 0 NOT NULL,
	`image_url` text DEFAULT '' NOT NULL,
	`text` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE `save_group_mm` (
	`user_id` text NOT NULL,
	`save_id` text NOT NULL,
	`group_id` text NOT NULL
);
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL
);
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text DEFAULT '' NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`avatar_url` text DEFAULT '' NOT NULL,
	`api_key_hash` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
INSERT INTO user VALUES('u1','jramke','Joost','https://avatars.githubusercontent.com/u/583231','secret-hash','2023-01-01 10:00:00');
INSERT INTO user VALUES('u2','other','Somebody Else','','','2023-02-01 10:00:00');
INSERT INTO oauth_account VALUES('github','583231','u1');
INSERT INTO session VALUES('s1','u1',1999999999);
INSERT INTO "group" VALUES('g1','u1','Reading',3,'',100,'2024-02-01T10:00:00.000Z');
INSERT INTO save_group_mm VALUES('u1','w1','g1');

-- A link with everything the old app scraped.
INSERT INTO save VALUES('w1','u1','website','https://www.Example.com/post?utm_source=newsletter','An article','About things','https://www.example.com/favicon.ico',4,'https://cdn.example.com/og.jpg','','2024-03-01T10:00:00.000Z');
-- The same page saved again later, with other tracking noise.
INSERT INTO save VALUES('w2','u1','website','https://WWW.example.com/post?utm_campaign=x#top','','','',1,'','','2024-03-05T09:00:00.000Z');
-- A website without a url, and one that is not a web url.
INSERT INTO save VALUES('w3','u1','website','','No url','','',0,'','','2024-03-06T09:00:00.000Z');
INSERT INTO save VALUES('w4','u1','website','javascript:alert(1)','Bookmarklet','','',0,'','','2024-03-06T09:30:00.000Z');
-- A date nobody can read.
INSERT INTO save VALUES('w5','u1','website','https://example.org/undated','Undated','','',0,'','','sometime last spring');
-- A note, with the date format SQLite writes by itself.
INSERT INTO save VALUES('t1','u1','text','','','','',2,'','remember the milk','2024-03-02 08:30:00');
INSERT INTO save VALUES('t2','u1','text','','Empty','','',2,'','','2024-03-02 08:31:00');
-- An image: the image url is the source, the description a caption.
INSERT INTO save VALUES('i1','u1','image','','cat','my cat','',0,'https://images.example.com/cat.jpg','','2024-03-03T12:00:00.000Z');
INSERT INTO save VALUES('i2','u1','image','','No image','','',0,'','','2024-03-03T12:30:00.000Z');
-- Colors keep their value in the title.
INSERT INTO save VALUES('c1','u1','color','','#E63946','brand red','',5,'','','2024-03-04T07:00:00.000Z');
INSERT INTO save VALUES('c2','u1','color','','not a color','','',5,'','','2024-03-04T07:30:00.000Z');
INSERT INTO save VALUES('x0','u1','mystery','','?','','',0,'','','2024-03-04T08:00:00.000Z');

-- Another user of the old app.
INSERT INTO save VALUES('o1','u2','website','https://other.example/','Theirs','','',0,'','','2024-03-01T10:00:00.000Z');
COMMIT;
