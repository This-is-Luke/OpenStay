import { Database } from '../database/supabase';
import { 
  Property, 
  CreatePropertyRequest, 
  UpdatePropertyRequest, 
  SearchPropertiesRequest,
  PaginationResponse 
} from '../types';

class PropertyService {
  // Create new property listing
  async createProperty(hostId: string, propertyData: CreatePropertyRequest): Promise<Property> {
    const {
      title, description, propertyType, address, city, state, country,
      latitude, longitude, pricePerNight, cleaningFee, maxGuests,
      bedrooms, bathrooms, amenities, houseRules, images,
      instantBook, checkInTime, checkOutTime, cancellationPolicy
    } = propertyData;

    // Prepare data for database
    const propertyDbData = {
      host_id: hostId,
      title,
      description,
      property_type: propertyType,
      address,
      city,
      state: state || null,
      country,
      latitude: latitude || null,
      longitude: longitude || null,
      price_per_night: pricePerNight,
      cleaning_fee: cleaningFee || 0,
      max_guests: maxGuests,
      bedrooms: bedrooms || 1,
      bathrooms: bathrooms || 1,
      amenities: JSON.stringify(amenities || []),
      house_rules: JSON.stringify(houseRules || []),
      images: JSON.stringify(images),
      instant_book: instantBook || false,
      check_in_time: checkInTime || '15:00',
      check_out_time: checkOutTime || '11:00',
      cancellation_policy: cancellationPolicy || 'moderate'
    };

    // Create property
    const property = await Database.insert<any>('properties', propertyDbData);

    // Update user to be a host
    await Database.update('users', hostId, { is_host: true });

    return this.formatProperty(property);
  }

  // Get property by ID with host info and ratings
  async getPropertyById(propertyId: string, userId?: string): Promise<Property & {
    host: {
      firstName: string;
      lastName: string;
      profileImage?: string;
      joinedDate: Date;
    };
    averageRating: number;
    reviewCount: number;
    isOwner: boolean;
  }> {
    // Get property with host information
    const properties = await Database.select<any>(
      'properties', 
      `
        *,
        users!properties_host_id_fkey (
          first_name,
          last_name,
          profile_image,
          created_at
        )
      `,
      { id: propertyId, is_active: true }
    );

    if (properties.length === 0) {
      throw new Error('Property not found');
    }

    const property = properties[0];

    // Get reviews for this property
    const reviews = await Database.select<any>('reviews', 'rating', { property_id: propertyId });
    
    const averageRating = reviews.length > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
      : 0;

    // Check if user is the host
    const isOwner = userId ? property.host_id === userId : false;

    return {
      ...this.formatProperty(property),
      host: {
        firstName: property.users.first_name,
        lastName: property.users.last_name,
        profileImage: property.users.profile_image || undefined,
        joinedDate: new Date(property.users.created_at)
      },
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      reviewCount: reviews.length,
      isOwner
    };
  }

  // Search properties with advanced filtering
  async searchProperties(searchParams: SearchPropertiesRequest): Promise<PaginationResponse<Property & {
    host: {
      firstName: string;
      lastName: string;
    };
    averageRating: number;
    reviewCount: number;
  }>> {
    const {
      city, country, checkIn, checkOut, guests, minPrice, maxPrice,
      propertyType, amenities, instantBook, page = 1, limit = 20
    } = searchParams;

    // Build base query
    let query = `
      SELECT 
        p.*,
        u.first_name as host_first_name,
        u.last_name as host_last_name,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as review_count
      FROM properties p
      JOIN users u ON p.host_id = u.id
      LEFT JOIN reviews r ON p.id = r.property_id
      WHERE p.is_active = true
    `;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Add search conditions
    if (city) {
      conditions.push(`LOWER(p.city) LIKE LOWER($${paramIndex})`);
      params.push(`%${city}%`);
      paramIndex++;
    }

    if (country) {
      conditions.push(`LOWER(p.country) LIKE LOWER($${paramIndex})`);
      params.push(`%${country}%`);
      paramIndex++;
    }

    if (guests) {
      conditions.push(`p.max_guests >= $${paramIndex}`);
      params.push(guests);
      paramIndex++;
    }

    if (minPrice) {
      conditions.push(`p.price_per_night >= $${paramIndex}`);
      params.push(minPrice);
      paramIndex++;
    }

    if (maxPrice) {
      conditions.push(`p.price_per_night <= $${paramIndex}`);
      params.push(maxPrice);
      paramIndex++;
    }

    if (propertyType) {
      conditions.push(`p.property_type = $${paramIndex}`);
      params.push(propertyType);
      paramIndex++;
    }

    if (instantBook !== undefined) {
      conditions.push(`p.instant_book = $${paramIndex}`);
      params.push(instantBook);
      paramIndex++;
    }

    // Check availability if dates provided
    if (checkIn && checkOut) {
      conditions.push(`
        NOT EXISTS (
          SELECT 1 FROM bookings b 
          WHERE b.property_id = p.id 
          AND b.status IN ('paid', 'confirmed', 'checked_in')
          AND (
            (b.check_in <= $${paramIndex} AND b.check_out > $${paramIndex}) OR
            (b.check_in < $${paramIndex + 1} AND b.check_out >= $${paramIndex + 1}) OR
            (b.check_in >= $${paramIndex} AND b.check_out <= $${paramIndex + 1})
          )
        )
      `);
      params.push(checkIn, checkOut);
      paramIndex += 2;
    }

    // Amenities filter (PostgreSQL JSONB contains)
    if (amenities && amenities.length > 0) {
      conditions.push(`p.amenities @> $${paramIndex}::jsonb`);
      params.push(JSON.stringify(amenities));
      paramIndex++;
    }

    // Add conditions to query
    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    // Add GROUP BY and ORDER BY
    query += `
      GROUP BY p.id, u.first_name, u.last_name
      ORDER BY p.created_at DESC
    `;

    // Add pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    // Execute search query
    const searchResult = await Database.query<any>(query, params);

    // Count query for pagination (without LIMIT/OFFSET)
    let countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM properties p
      JOIN users u ON p.host_id = u.id
      WHERE p.is_active = true
    `;

    if (conditions.length > 0) {
      countQuery += ' AND ' + conditions.join(' AND ');
    }

    const countResult = await Database.query<{ total: string }>(countQuery, params.slice(0, -2));

    // Format results
    const properties = searchResult.map(property => ({
      ...this.formatProperty(property),
      host: {
        firstName: property.host_first_name,
        lastName: property.host_last_name
      },
      averageRating: Math.round(parseFloat(property.average_rating) * 10) / 10,
      reviewCount: parseInt(property.review_count)
    }));

    const total = parseInt(countResult[0]?.total || '0');
    const totalPages = Math.ceil(total / limit);

    return {
      data: properties,
      pagination: {
        page: parseInt(page.toString()),
        limit: parseInt(limit.toString()),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  // Get host's properties
  async getHostProperties(hostId: string): Promise<(Property & {
    averageRating: number;
    reviewCount: number;
    totalBookings: number;
  })[]> {
    const query = `
      SELECT 
        p.*,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(DISTINCT r.id) as review_count,
        COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END) as total_bookings
      FROM properties p
      LEFT JOIN reviews r ON p.id = r.property_id
      LEFT JOIN bookings b ON p.id = b.property_id
      WHERE p.host_id = $1
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;

    const result = await Database.query<any>(query, [hostId]);

    return result.map(property => ({
      ...this.formatProperty(property),
      averageRating: Math.round(parseFloat(property.average_rating) * 10) / 10,
      reviewCount: parseInt(property.review_count),
      totalBookings: parseInt(property.total_bookings)
    }));
  }

  
  async getAllProperties(): Promise<Property[]> {
    const query = `
      SELECT 
        p.*,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as review_count
      FROM properties p
      LEFT JOIN reviews r ON p.id = r.property_id
      WHERE p.is_active = true
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;

    const result = await Database.query<any>(query);

    return result.map(property => this.formatProperty(property));
  }
  // Update property
  async updateProperty(
    propertyId: string, 
    hostId: string, 
    updateData: UpdatePropertyRequest
  ): Promise<Property> {
    const {
      title, description, pricePerNight, cleaningFee, maxGuests,
      amenities, houseRules, images, instantBook, checkInTime,
      checkOutTime, cancellationPolicy, isActive
    } = updateData;

    // Prepare update data
    const updateFields: any = {};
    if (title !== undefined) updateFields.title = title;
    if (description !== undefined) updateFields.description = description;
    if (pricePerNight !== undefined) updateFields.price_per_night = pricePerNight;
    if (cleaningFee !== undefined) updateFields.cleaning_fee = cleaningFee;
    if (maxGuests !== undefined) updateFields.max_guests = maxGuests;
    if (amenities !== undefined) updateFields.amenities = JSON.stringify(amenities);
    if (houseRules !== undefined) updateFields.house_rules = JSON.stringify(houseRules);
    if (images !== undefined) updateFields.images = JSON.stringify(images);
    if (instantBook !== undefined) updateFields.instant_book = instantBook;
    if (checkInTime !== undefined) updateFields.check_in_time = checkInTime;
    if (checkOutTime !== undefined) updateFields.check_out_time = checkOutTime;
    if (cancellationPolicy !== undefined) updateFields.cancellation_policy = cancellationPolicy;
    if (isActive !== undefined) updateFields.is_active = isActive;

    // Check if property belongs to host
    const properties = await Database.select<any>('properties', 'id', { id: propertyId, host_id: hostId });
    if (properties.length === 0) {
      throw new Error('Property not found or unauthorized');
    }

    // Update property
    const property = await Database.update<any>('properties', propertyId, updateFields);

    return this.formatProperty(property);
  }

  // Delete property (soft delete)
  async deleteProperty(propertyId: string, hostId: string): Promise<{ id: string; deleted: boolean }> {
    // Check for active bookings
    const activeBookings = await Database.select<any>(
      'bookings', 
      'id', 
      { property_id: propertyId }
    );

    const hasActiveBookings = activeBookings.some(booking => 
      ['paid', 'confirmed', 'checked_in'].includes(booking.status)
    );

    if (hasActiveBookings) {
      throw new Error('Cannot delete property with active bookings');
    }

    // Check if property belongs to host
    const properties = await Database.select<any>('properties', 'id', { id: propertyId, host_id: hostId });
    if (properties.length === 0) {
      throw new Error('Property not found or unauthorized');
    }

    // Soft delete the property
    await Database.update('properties', propertyId, { is_active: false });

    return { id: propertyId, deleted: true };
  }

  // Check property availability
  async checkAvailability(propertyId: string, checkIn: string, checkOut: string): Promise<boolean> {
    const query = `
      SELECT 
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM bookings 
            WHERE property_id = $1 
            AND status IN ('paid', 'confirmed', 'checked_in')
            AND (
              (check_in <= $2 AND check_out > $2) OR
              (check_in < $3 AND check_out >= $3) OR
              (check_in >= $2 AND check_out <= $3)
            )
          ) THEN false
          ELSE true
        END as is_available
    `;

    const result = await Database.query<{ is_available: boolean }>(query, [propertyId, checkIn, checkOut]);
    return result[0]?.is_available || false;
  }
async createBooking(propertyId: number, guestId: string, checkIn: Date, checkOut: Date) {
  const totalPrice = await this.calculatePrice(propertyId, checkIn, checkOut);

  const query = `
    INSERT INTO bookings (property_id, guest_id, check_in_date, check_out_date, total_price, status)
    VALUES ($1, $2, $3, $4, $5, 'pending')
    RETURNING *
  `;

  const result = await Database.query<any>(query, [
    propertyId,
    guestId,
    checkIn.toISOString(),
    checkOut.toISOString(),
    totalPrice
  ]);

  return result[0]; // returning the newly created booking
}

async calculatePrice(propertyId: number, checkIn: Date, checkOut: Date): Promise<number> {
  // Query the property's price per night using raw SQL
  const query = `
    SELECT price_per_night
    FROM properties
    WHERE id = $1
    LIMIT 1
  `;

  const result = await Database.query<{ price_per_night: string }>(query, [propertyId]);

  if (!result[0]) {
    throw new Error('Property not found');
  }

  const pricePerNight = parseFloat(result[0].price_per_night);

  // Calculate the number of nights
  const nights = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24);

  return nights * pricePerNight;
}

  // Get properties by location (for map view)
  async getPropertiesByLocation(
    bounds: { north: number; south: number; east: number; west: number },
    filters?: Partial<SearchPropertiesRequest>
  ): Promise<Array<{
    id: string;
    title: string;
    latitude: number;
    longitude: number;
    pricePerNight: number;
    averageRating: number;
    images: string[];
  }>> {
    const { north, south, east, west } = bounds;

    let query = `
      SELECT 
        p.id,
        p.title,
        p.latitude,
        p.longitude,
        p.price_per_night,
        p.images,
        COALESCE(AVG(r.rating), 0) as average_rating
      FROM properties p
      LEFT JOIN reviews r ON p.id = r.property_id
      WHERE p.is_active = true
      AND p.latitude IS NOT NULL
      AND p.longitude IS NOT NULL
      AND p.latitude BETWEEN $1 AND $2
      AND p.longitude BETWEEN $3 AND $4
    `;

    const params = [south, north, west, east];
    let paramIndex = 5;

    // Add filters
    if (filters?.guests) {
      query += ` AND p.max_guests >= $${paramIndex}`;
      params.push(filters.guests);
      paramIndex++;
    }

    if (filters?.minPrice) {
      query += ` AND p.price_per_night >= $${paramIndex}`;
      params.push(filters.minPrice);
      paramIndex++;
    }

    if (filters?.maxPrice) {
      query += ` AND p.price_per_night <= $${paramIndex}`;
      params.push(filters.maxPrice);
      paramIndex++;
    }

    query += ' GROUP BY p.id LIMIT 100'; // Limit for performance

    const result = await Database.query<any>(query, params);

    return result.map(property => ({
      id: property.id,
      title: property.title,
      latitude: parseFloat(property.latitude),
      longitude: parseFloat(property.longitude),
      pricePerNight: parseFloat(property.price_per_night),
      averageRating: Math.round(parseFloat(property.average_rating) * 10) / 10,
      images: JSON.parse(property.images)
    }));
  }

  // Get similar properties (based on location and type)
  async getSimilarProperties(propertyId: string, limit: number = 6): Promise<Property[]> {
    const query = `
      WITH target_property AS (
        SELECT city, country, property_type, price_per_night
        FROM properties 
        WHERE id = $1
      )
      SELECT p.*
      FROM properties p, target_property tp
      WHERE p.id != $1
      AND p.is_active = true
      AND (
        (p.city = tp.city AND p.country = tp.country) OR
        (p.country = tp.country AND p.property_type = tp.property_type) OR
        (ABS(p.price_per_night - tp.price_per_night) < tp.price_per_night * 0.3)
      )
      ORDER BY 
        CASE WHEN p.city = tp.city AND p.country = tp.country THEN 1 ELSE 2 END,
        ABS(p.price_per_night - tp.price_per_night)
      LIMIT $2
    `;

    const result = await Database.query<any>(query, [propertyId, limit]);
    return result.map(property => this.formatProperty(property));
  }

  // Format property object
  private formatProperty(property: any): Property {
    return {
      id: property.id,
      hostId: property.host_id,
      title: property.title,
      description: property.description,
      propertyType: property.property_type,
      address: property.address,
      city: property.city,
      state: property.state || undefined,
      country: property.country,
      latitude: property.latitude ? parseFloat(property.latitude) : undefined,
      longitude: property.longitude ? parseFloat(property.longitude) : undefined,
      pricePerNight: parseFloat(property.price_per_night),
      cleaningFee: parseFloat(property.cleaning_fee),
      serviceFeePercentage: parseFloat(property.service_fee_percentage),
      maxGuests: property.max_guests,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      amenities: typeof property.amenities === 'string' ? JSON.parse(property.amenities) : property.amenities,
      houseRules: typeof property.house_rules === 'string' ? JSON.parse(property.house_rules) : property.house_rules,
      images: typeof property.images === 'string' ? JSON.parse(property.images) : property.images,
      isActive: property.is_active,
      instantBook: property.instant_book,
      checkInTime: property.check_in_time,
      checkOutTime: property.check_out_time,
      cancellationPolicy: property.cancellation_policy,
      createdAt: new Date(property.created_at),
      updatedAt: new Date(property.updated_at)
    };
  }

 


}

export default new PropertyService();