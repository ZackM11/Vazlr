-- VAZLR sample data (PostgreSQL) -- FOR LOCAL DEVELOPMENT ONLY
-- Everything here is fictional. All sample accounts share ONE dev password: VazlrDemo1!
-- (stored as a bcrypt hash). Do not deploy these accounts anywhere real.
-- The single admin account is NOT seeded; create it with your one-time script.
--
-- Safe to run twice: every insert uses ON CONFLICT DO NOTHING.
--
-- Rows: 16 users (6 organizations + 10 volunteers), 8 categories, 20 events, 35 bookings.

-- ---------------------------------------------------------------------------
-- users: ids 1-6 are organizations, ids 7-16 are volunteers
-- ---------------------------------------------------------------------------
INSERT INTO users (id, email, password_hash, role)
SELECT u.id, u.email, '$2b$10$R2tpOYdPgwxaw3ID5rVIIu.3Eh9rYOgY4Dhchlg.Xk32ZHIIxMQ/G', u.role
FROM (VALUES
    (1,  'foodshare@example.com',      'organization'),
    (2,  'creekcrew@example.com',      'organization'),
    (3,  'pawsrescue@example.com',     'organization'),
    (4,  'readersbridge@example.com',  'organization'),
    (5,  'silveryears@example.com',    'organization'),
    (6,  'canyonarts@example.com',     'organization'),
    (7,  'asha.rao@example.com',       'volunteer'),
    (8,  'ben.carter@example.com',     'volunteer'),
    (9,  'chloe.nguyen@example.com',   'volunteer'),
    (10, 'diego.martinez@example.com', 'volunteer'),
    (11, 'elena.petrova@example.com',  'volunteer'),
    (12, 'farhan.ali@example.com',     'volunteer'),
    (13, 'grace.kim@example.com',      'volunteer'),
    (14, 'hiro.tanaka@example.com',    'volunteer'),
    (15, 'isabel.okafor@example.com',  'volunteer'),
    (16, 'jamal.brooks@example.com',   'volunteer')
) AS u(id, email, role)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- organizations: four verified, two still waiting for verification
-- ---------------------------------------------------------------------------
INSERT INTO organizations (user_id, name, description, website, city, is_verified, verified_at) VALUES
    (1, 'Flatirons Food Share',
        'A neighborhood food pantry and community kitchen serving families across Boulder.',
        'https://example.com/foodshare', 'Boulder', TRUE, NOW() - INTERVAL '120 days'),
    (2, 'Creekside Cleanup Crew',
        'Volunteers caring for creeks, trails and green spaces around Boulder.',
        'https://example.com/creekcrew', 'Boulder', TRUE, NOW() - INTERVAL '90 days'),
    (3, 'Front Range Paws Rescue',
        'A no-kill animal shelter that relies on volunteers for walks, socializing and adoption days.',
        'https://example.com/pawsrescue', 'Longmont', TRUE, NOW() - INTERVAL '60 days'),
    (4, 'Readers Bridge',
        'Connects volunteers with students who want extra help with reading and homework.',
        'https://example.com/readersbridge', 'Lafayette', TRUE, NOW() - INTERVAL '45 days'),
    (5, 'Silver Years Companions',
        'Friendly visits and practical help for older neighbors living on their own.',
        'https://example.com/silveryears', 'Louisville', FALSE, NULL),
    (6, 'Canyon Arts Collective',
        'A community art studio running murals, workshops and gallery nights.',
        'https://example.com/canyonarts', 'Denver', FALSE, NULL)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- volunteers (one has no phone number, to test optional fields)
-- ---------------------------------------------------------------------------
INSERT INTO volunteers (user_id, first_name, last_name, phone, city, zip) VALUES
    (7,  'Asha',   'Rao',      '555-0201', 'Boulder',    '80302'),
    (8,  'Ben',    'Carter',   '555-0202', 'Boulder',    '80304'),
    (9,  'Chloe',  'Nguyen',   '555-0203', 'Longmont',   '80501'),
    (10, 'Diego',  'Martinez', '555-0204', 'Boulder',    '80301'),
    (11, 'Elena',  'Petrova',  '555-0205', 'Lafayette',  '80026'),
    (12, 'Farhan', 'Ali',      '555-0206', 'Denver',     '80202'),
    (13, 'Grace',  'Kim',      '555-0207', 'Louisville', '80027'),
    (14, 'Hiro',   'Tanaka',   '555-0208', 'Longmont',   '80501'),
    (15, 'Isabel', 'Okafor',   '555-0209', 'Boulder',    '80303'),
    (16, 'Jamal',  'Brooks',   NULL,       'Denver',     '80202')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
INSERT INTO categories (id, name) VALUES
    (1, 'Environment'),
    (2, 'Food & Hunger'),
    (3, 'Education'),
    (4, 'Animal Welfare'),
    (5, 'Health & Wellness'),
    (6, 'Community'),
    (7, 'Arts & Culture'),
    (8, 'Seniors')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- events
-- day_offset is relative to today, so the sample events always look upcoming
-- (negative = in the past). Times are Mountain Time (America/Denver).
-- Edge cases on purpose: event 9 fills up (capacity 3), event 17 has no picture,
-- event 20 is cancelled, events 8 and 12 are completed, events 3, 7, 15, 18 have no sign-ups.
-- ---------------------------------------------------------------------------
INSERT INTO events (id, organization_id, category_id, title, description, image_url,
                    address, city, zip, start_time, end_time, capacity, status)
SELECT v.id, v.organization_id, v.category_id, v.title, v.description, v.image_url,
       v.address, v.city, v.zip,
       ((CURRENT_DATE + v.day_offset) + v.start_at) AT TIME ZONE 'America/Denver',
       ((CURRENT_DATE + v.day_offset) + v.end_at)   AT TIME ZONE 'America/Denver',
       v.capacity, v.status
FROM (VALUES
 (1,  1, 2, 'Saturday Pantry Sorting',
      'Sort and shelve donated groceries so families can shop the pantry on Monday. Closed-toe shoes required.',
      '/images/events/pantry-sorting.jpg', '250 Maple St', 'Boulder', '80302',
      3, TIME '09:00', TIME '12:00', 12, 'open'),
 (2,  1, 2, 'Community Meal Prep and Serve',
      'Help cook and serve a free dinner for about 80 neighbors. No cooking experience needed.',
      '/images/events/meal-prep.jpg', '250 Maple St', 'Boulder', '80302',
      6, TIME '15:00', TIME '19:00', 15, 'open'),
 (3,  1, 2, 'Holiday Food Drive Packing',
      'Pack holiday boxes with shelf-stable food and a recipe card for local families.',
      '/images/events/food-drive.jpg', '250 Maple St', 'Boulder', '80302',
      20, TIME '10:00', TIME '14:00', 25, 'open'),
 (4,  1, 6, 'Neighborhood Welcome Potluck',
      'Welcome new neighbors with a potluck in the park. Volunteers help with setup, greeting and cleanup.',
      '/images/events/potluck.jpg', '15 Aspen Park', 'Boulder', '80304',
      21, TIME '17:00', TIME '20:00', 20, 'open'),
 (5,  2, 1, 'Creek Trail Cleanup',
      'Pick up litter along the creek path. Gloves and bags provided.',
      '/images/events/creek-cleanup.jpg', '40 Riverside Dr', 'Boulder', '80301',
      4, TIME '09:00', TIME '12:00', 20, 'open'),
 (6,  2, 1, 'Native Tree Planting Day',
      'Plant native trees along the greenway. Bring water and sun protection.',
      '/images/events/tree-planting.jpg', '1 Greenway Trailhead', 'Boulder', '80301',
      10, TIME '10:00', TIME '15:00', 30, 'open'),
 (7,  2, 1, 'Invasive Weed Pull',
      'Learn to identify and pull invasive weeds that crowd out native plants.',
      '/images/events/weed-pull.jpg', '40 Riverside Dr', 'Boulder', '80301',
      16, TIME '08:30', TIME '11:30', 15, 'open'),
 (8,  2, 1, 'Autumn Leaf Cleanup',
      'Rake and bag leaves for neighbors who cannot do it themselves.',
      '/images/events/leaf-cleanup.jpg', '40 Riverside Dr', 'Boulder', '80301',
      -14, TIME '09:00', TIME '12:00', 20, 'completed'),
 (9,  3, 4, 'Dog Walking at the Shelter',
      'Walk shelter dogs and give them a break from the kennel. Short training provided.',
      '/images/events/dog-walking.jpg', '88 Kennel Rd', 'Longmont', '80501',
      2, TIME '10:00', TIME '12:00', 3, 'open'),
 (10, 3, 4, 'Kitten Socialization Hour',
      'Play with and gently handle kittens so they grow up comfortable around people.',
      '/images/events/kittens.jpg', '88 Kennel Rd', 'Longmont', '80501',
      7, TIME '14:00', TIME '16:00', 6, 'open'),
 (11, 3, 4, 'Adoption Day Helpers',
      'Greet visitors, answer questions and help match animals with their new families.',
      '/images/events/adoption-day.jpg', '88 Kennel Rd', 'Longmont', '80501',
      13, TIME '11:00', TIME '16:00', 10, 'open'),
 (12, 3, 4, 'Fall Adoption Fair',
      'Set up and run the fall adoption fair.',
      '/images/events/adoption-fair.jpg', '88 Kennel Rd', 'Longmont', '80501',
      -21, TIME '11:00', TIME '16:00', 10, 'completed'),
 (13, 4, 3, 'After-School Reading Buddies',
      'Read one-on-one with elementary students who are building confidence.',
      '/images/events/reading-buddies.jpg', '12 Library Ln', 'Lafayette', '80026',
      5, TIME '15:30', TIME '17:30', 10, 'open'),
 (14, 4, 3, 'Homework Help Night',
      'Help middle schoolers with math and writing homework.',
      '/images/events/homework-help.jpg', '12 Library Ln', 'Lafayette', '80026',
      9, TIME '18:00', TIME '20:00', 8, 'open'),
 (15, 4, 3, 'Book Sorting and Shelving',
      'Sort donated books for our free community library carts.',
      '/images/events/book-sorting.jpg', '12 Library Ln', 'Lafayette', '80026',
      18, TIME '10:00', TIME '13:00', 12, 'open'),
 (16, 5, 8, 'Friendly Visit Afternoon',
      'Spend an afternoon chatting, playing cards and having tea with residents.',
      '/images/events/friendly-visit.jpg', '300 Sunset Way', 'Louisville', '80027',
      8, TIME '13:00', TIME '15:00', 8, 'open'),
 (17, 5, 8, 'Tech Help for Seniors',
      'Help seniors with phones, video calls and online safety.',
      NULL, '300 Sunset Way', 'Louisville', '80027',
      12, TIME '10:00', TIME '12:00', 6, 'open'),
 (18, 5, 5, 'Chair Yoga Assistant',
      'Assist an instructor during a gentle chair yoga class for older adults.',
      '/images/events/chair-yoga.jpg', '300 Sunset Way', 'Louisville', '80027',
      14, TIME '09:30', TIME '11:00', 5, 'open'),
 (19, 6, 7, 'Mural Painting Weekend',
      'Paint a community mural on the side of the studio. All skill levels welcome.',
      '/images/events/mural.jpg', '900 Canyon Ave', 'Denver', '80202',
      11, TIME '10:00', TIME '16:00', 15, 'open'),
 (20, 6, 7, 'Gallery Opening Setup Crew',
      'Hang artwork and set up tables before the gallery opening.',
      '/images/events/gallery-setup.jpg', '900 Canyon Ave', 'Denver', '80202',
      15, TIME '16:00', TIME '19:00', 10, 'cancelled')
) AS v(id, organization_id, category_id, title, description, image_url,
       address, city, zip, day_offset, start_at, end_at, capacity, status)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- bookings
-- Each volunteer has one emergency contact, joined in below so it is not repeated
-- on every row. "ago" is how long before now the booking was made.
-- Edge cases on purpose: event 9 is full plus one waitlisted booking, event 5 has a
-- volunteer cancellation, event 20 has a booking cancelled with the event.
-- ---------------------------------------------------------------------------
INSERT INTO bookings (event_id, volunteer_id, status, emergency_contact_name,
                      emergency_contact_phone, notes, waiver_accepted, booked_at)
SELECT b.event_id, b.volunteer_id, b.status, ec.name, ec.phone, b.notes, TRUE, NOW() - b.ago
FROM (VALUES
 (1,  7,  'confirmed', 'Can bring a second helper',          INTERVAL '6 days'),
 (1,  9,  'confirmed', NULL,                                 INTERVAL '5 days'),
 (1,  13, 'confirmed', NULL,                                 INTERVAL '3 days'),
 (2,  8,  'confirmed', 'Vegetarian meal please',             INTERVAL '4 days'),
 (4,  9,  'confirmed', NULL,                                 INTERVAL '2 days'),
 (4,  16, 'confirmed', NULL,                                 INTERVAL '1 day'),
 (5,  7,  'confirmed', NULL,                                 INTERVAL '7 days'),
 (5,  8,  'confirmed', NULL,                                 INTERVAL '6 days'),
 (5,  11, 'confirmed', NULL,                                 INTERVAL '5 days'),
 (5,  12, 'confirmed', NULL,                                 INTERVAL '4 days'),
 (5,  16, 'cancelled', 'Schedule conflict',                  INTERVAL '3 days'),
 (6,  7,  'confirmed', NULL,                                 INTERVAL '3 days'),
 (6,  10, 'confirmed', 'Bringing my own shovel',             INTERVAL '2 days'),
 (8,  7,  'confirmed', NULL,                                 INTERVAL '20 days'),
 (8,  8,  'confirmed', NULL,                                 INTERVAL '19 days'),
 (8,  12, 'confirmed', NULL,                                 INTERVAL '18 days'),
 (9,  9,  'confirmed', NULL,                                 INTERVAL '6 days'),
 (9,  11, 'confirmed', NULL,                                 INTERVAL '5 days'),
 (9,  14, 'confirmed', 'Experienced with large dogs',        INTERVAL '4 days'),
 (9,  15, 'waitlisted', NULL,                                INTERVAL '2 days'),
 (10, 8,  'confirmed', NULL,                                 INTERVAL '3 days'),
 (10, 10, 'confirmed', NULL,                                 INTERVAL '2 days'),
 (11, 12, 'confirmed', NULL,                                 INTERVAL '1 day'),
 (12, 10, 'confirmed', NULL,                                 INTERVAL '26 days'),
 (12, 13, 'confirmed', NULL,                                 INTERVAL '25 days'),
 (13, 13, 'confirmed', NULL,                                 INTERVAL '5 days'),
 (13, 14, 'confirmed', NULL,                                 INTERVAL '4 days'),
 (13, 16, 'confirmed', NULL,                                 INTERVAL '2 days'),
 (14, 13, 'confirmed', 'Math and writing',                   INTERVAL '2 days'),
 (16, 15, 'confirmed', NULL,                                 INTERVAL '3 days'),
 (16, 16, 'confirmed', NULL,                                 INTERVAL '1 day'),
 (17, 10, 'confirmed', 'Can help with Android phones',       INTERVAL '2 days'),
 (19, 12, 'confirmed', NULL,                                 INTERVAL '3 days'),
 (19, 14, 'confirmed', NULL,                                 INTERVAL '2 days'),
 (20, 11, 'cancelled', 'Event cancelled by organizer',       INTERVAL '4 days')
) AS b(event_id, volunteer_id, status, notes, ago)
JOIN (VALUES
 (7,  'Meera Rao',       '555-0107'),
 (8,  'Laura Carter',    '555-0108'),
 (9,  'Minh Nguyen',     '555-0109'),
 (10, 'Rosa Martinez',   '555-0110'),
 (11, 'Ivan Petrov',     '555-0111'),
 (12, 'Samira Ali',      '555-0112'),
 (13, 'David Kim',       '555-0113'),
 (14, 'Yuki Tanaka',     '555-0114'),
 (15, 'Chidi Okafor',    '555-0115'),
 (16, 'Denise Brooks',   '555-0116')
) AS ec(volunteer_id, name, phone) ON ec.volunteer_id = b.volunteer_id
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Rows above were inserted with explicit ids, which does not advance the id
-- counters. Move them forward so new rows created by the app do not collide.
-- ---------------------------------------------------------------------------
SELECT setval(pg_get_serial_sequence('users', 'id'),      (SELECT MAX(id) FROM users));
SELECT setval(pg_get_serial_sequence('categories', 'id'), (SELECT MAX(id) FROM categories));
SELECT setval(pg_get_serial_sequence('events', 'id'),     (SELECT MAX(id) FROM events));