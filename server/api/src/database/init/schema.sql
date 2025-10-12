-- Sol-BnB Database Schema
-- This file will be automatically executed when the container starts

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    profile_image VARCHAR(500),
    
    -- Wallet integration
    wallet_address VARCHAR(44), 
    wallet_type VARCHAR(20),  
    wallet_connected_at TIMESTAMP,
    
    -- User roles
    is_host BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Properties/Listings table
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    host_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Basic info
    title VARCHAR(255) NOT NULL,
    description TEXT,
    property_type VARCHAR(50) NOT NULL, -- apartment, house, room, etc.
    
    -- Location
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    country VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Pricing
    price_per_night DECIMAL(10,2) NOT NULL,
    cleaning_fee DECIMAL(10,2) DEFAULT 0,
    service_fee_percentage DECIMAL(5,2) DEFAULT 3.0, -- Platform fee %
    
    -- Capacity
    max_guests INTEGER NOT NULL,
    bedrooms INTEGER DEFAULT 1,
    bathrooms INTEGER DEFAULT 1,
    
    -- Amenities and features
    amenities JSONB DEFAULT '[]'::jsonb,
    house_rules JSONB DEFAULT '[]'::jsonb,
    images JSONB DEFAULT '[]'::jsonb,
    
    -- Availability
    is_active BOOLEAN DEFAULT true,
    instant_book BOOLEAN DEFAULT false,
    
    -- Check-in/out times
    check_in_time TIME DEFAULT '15:00',
    check_out_time TIME DEFAULT '11:00',
    
    -- Cancellation policy
    cancellation_policy VARCHAR(20) DEFAULT 'moderate', -- flexible, moderate, strict
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Bookings table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id UUID REFERENCES users(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    
    -- Booking details
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    guest_count INTEGER NOT NULL,
    
    -- Pricing breakdown
    nights INTEGER NOT NULL,
    price_per_night DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    cleaning_fee DECIMAL(10,2) DEFAULT 0,
    service_fee DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    
    -- Booking status
    status VARCHAR(20) DEFAULT 'pending', 
    -- pending -> payment_required -> paid -> confirmed -> checked_in -> completed -> cancelled
    
    -- Guest info
    guest_message TEXT,
    special_requests TEXT,
    
    -- Blockchain integration
    escrow_address VARCHAR(44),     -- Solana escrow PDA address
    transaction_signature VARCHAR(88), -- Initial payment transaction
    payment_token VARCHAR(44),      -- USDC mint address
    escrow_created_at TIMESTAMP,
    funds_released_at TIMESTAMP,
    
    -- Cancellation
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    refund_amount DECIMAL(10,2),
    refund_transaction VARCHAR(88),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_dates CHECK (check_out > check_in),
    CONSTRAINT check_guests CHECK (guest_count > 0),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'payment_required', 'paid', 'confirmed', 'checked_in', 'completed', 'cancelled'))
);

-- Reviews table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id UUID REFERENCES users(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    
    -- Review content
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    comment TEXT,
    
    -- Review categories
    cleanliness_rating INTEGER CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    location_rating INTEGER CHECK (location_rating >= 1 AND location_rating <= 5),
    value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
    
    -- Review type
    review_type VARCHAR(20) NOT NULL, -- guest_to_host, host_to_guest
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Blockchain transactions log
CREATE TABLE blockchain_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    
    -- Transaction details
    transaction_signature VARCHAR(88) NOT NULL,
    transaction_type VARCHAR(30) NOT NULL, -- escrow_create, payment_deposit, funds_release, refund
    amount DECIMAL(10,2),
    token_mint VARCHAR(44),
    
    -- Accounts involved
    from_address VARCHAR(44),
    to_address VARCHAR(44),
    escrow_address VARCHAR(44),
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, failed
    block_height BIGINT,
    confirmation_count INTEGER DEFAULT 0,
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    confirmed_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_properties_host ON properties(host_id);
CREATE INDEX idx_properties_location ON properties(city, country);
CREATE INDEX idx_properties_active ON properties(is_active);
CREATE INDEX idx_bookings_guest ON bookings(guest_id);
CREATE INDEX idx_bookings_property ON bookings(property_id);
CREATE INDEX idx_bookings_dates ON bookings(check_in, check_out);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_escrow ON bookings(escrow_address);
CREATE INDEX idx_reviews_property ON reviews(property_id);
CREATE INDEX idx_blockchain_booking ON blockchain_transactions(booking_id);
CREATE INDEX idx_blockchain_signature ON blockchain_transactions(transaction_signature);

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();