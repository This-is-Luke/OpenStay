-- Sample data for development and testing
-- Password hash is for 'password123' - DO NOT use in production!

-- Insert sample users
INSERT INTO users (email, password_hash, first_name, last_name, phone, is_host, wallet_address, wallet_type) VALUES
('john@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uIoS', 'John', 'Doe', '+1234567890', true, '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', 'phantom'),
('jane@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uIoS', 'Jane', 'Smith', '+1234567891', false, '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', 'solflare'),
('host@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uIoS', 'Alice', 'Johnson', '+1234567892', true, 'DjVE6JNiYqPL2QXyCbFMKd1yKSUJKyVAHm1b8HrkPvqw', 'phantom'),
('guest@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uIoS', 'Bob', 'Wilson', '+1234567893', false, NULL, NULL);

-- Insert sample properties
INSERT INTO properties (host_id, title, description, property_type, address, city, state, country, price_per_night, cleaning_fee, max_guests, bedrooms, bathrooms, amenities, images) 
SELECT 
    u.id,
    'Beautiful Downtown Apartment',
    'A stunning 2-bedroom apartment in the heart of the city with amazing views and modern amenities. Perfect for business travelers and tourists alike.',
    'apartment',
    '123 Main Street, Downtown',
    'San Francisco',
    'California',
    'United States',
    150.00,
    25.00,
    4,
    2,
    2,
    '["WiFi", "Kitchen", "Air Conditioning", "Parking", "Elevator", "Gym"]'::jsonb,
    '["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267", "https://images.unsplash.com/photo-1484154218962-a197022b5858"]'::jsonb
FROM users u WHERE u.email = 'john@example.com';

INSERT INTO properties (host_id, title, description, property_type, address, city, state, country, price_per_night, cleaning_fee, max_guests, bedrooms, bathrooms, amenities, images)
SELECT 
    u.id,
    'Cozy Beach House',
    'Perfect getaway by the beach with stunning ocean views and private beach access. Wake up to the sound of waves every morning.',
    'house',
    '456 Ocean Drive',
    'Miami',
    'Florida',
    'United States',
    250.00,
    50.00,
    6,
    3,
    2,
    '["WiFi", "Kitchen", "Beach Access", "Pool", "Parking", "BBQ Grill", "Hot Tub"]'::jsonb,
    '["https://images.unsplash.com/photo-1499793983690-e29da59ef1c2", "https://images.unsplash.com/photo-1520637836862-4d197d17c93a"]'::jsonb
FROM users u WHERE u.email = 'host@example.com';

INSERT INTO properties (host_id, title, description, property_type, address, city, country, price_per_night, max_guests, bedrooms, bathrooms, amenities, images)
SELECT 
    u.id,
    'Modern Studio in Tech District',
    'A sleek, modern studio apartment perfect for solo travelers or couples. Located in the heart of the tech district with easy access to major companies.',
    'studio',
    '789 Innovation Blvd',
    'Austin',
    'United States',
    95.00,
    2,
    1,
    1,
    '["WiFi", "Kitchen", "Air Conditioning", "Workspace", "Smart TV"]'::jsonb,
    '["https://images.unsplash.com/photo-1586023492125-27b2c045efd7", "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2"]'::jsonb
FROM users u WHERE u.email = 'john@example.com';

-- Insert sample booking (for testing)
INSERT INTO bookings (guest_id, property_id, check_in, check_out, guest_count, nights, price_per_night, subtotal, cleaning_fee, service_fee, total_amount, status, guest_message)
SELECT 
    g.id,
    p.id,
    CURRENT_DATE + INTERVAL '7 days',
    CURRENT_DATE + INTERVAL '10 days',
    2,
    3,
    150.00,
    450.00,
    25.00,
    13.50,
    488.50,
    'pending',
    'Looking forward to staying at your beautiful place!'
FROM users g, properties p 
WHERE g.email = 'jane@example.com' 
AND p.title = 'Beautiful Downtown Apartment';

-- Insert sample review
INSERT INTO reviews (booking_id, reviewer_id, reviewee_id, property_id, rating, title, comment, cleanliness_rating, communication_rating, location_rating, value_rating, review_type)
SELECT 
    b.id,
    b.guest_id,
    p.host_id,
    b.property_id,
    5,
    'Amazing stay!',
    'The apartment was exactly as described. Clean, comfortable, and in a great location. The host was very responsive and helpful.',
    5,
    5,
    5,
    4,
    'guest_to_host'
FROM bookings b
JOIN properties p ON b.property_id = p.id
WHERE b.status = 'pending';

-- Update the booking status to completed for the review
UPDATE bookings SET status = 'completed' WHERE status = 'pending';