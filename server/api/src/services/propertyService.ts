import { query, transaction } from '../database/connection';
import { 
  Property, 
  CreatePropertyRequest, 
  UpdatePropertyRequest, 
  SearchPropertiesRequest,
  PaginationResponse 
} from '../types/index';

class PropertyService {
  // Create new property listing
  async createProperty(hostId: string, propertyData: CreatePropertyRequest): Promise<Property> {
    const {
      title, description, propertyType, address, city, state, country,
      latitude, longitude, pricePerNight, cleaningFee, maxGuests,
      bedrooms, bathrooms, amenities, houseRules, images,
      instantBook, checkInTime, checkOutTime, cancellationPolicy
    } = propertyData;

    return await transaction(async (client) => {
      // Create property
      const propertyResult = await client.query<{
        id: string;
        host_id: string;
        title: string;
        description: string;
        property_type: string;
        address: string;
        city: string;
        state: string | null;
        country: string;
        latitude: number | null;
        longitude: number | null;
        price_per_night: string;
        cleaning_fee: string;
        service_fee_percentage: string;
        max_guests: number;
        bedrooms: number;
        bathrooms: number;
        amenities: any;
        house_rules: any;
        images: any;
        is_active: boolean;
        instant_book: boolean;
        check_in_time: string;
        check_out_time: string;
        cancellation_policy: string;
        created_at: Date;
        updated_at: Date;
      }>(`
        INSERT INTO properties (
          host_id, title, description, property_type, address, city, state, country,
          latitude, longitude, price_per_night, cleaning_fee, max_guests,
          bedrooms, bathrooms, amenities, house_rules, images,
          instant_book, check_in_time, check_out_time, cancellation_policy
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        RETURNING *
      `, [
        hostId, title, description, propertyType, address, city, state, country,
        latitude, longitude, pricePerNight, cleaningFee || 0, maxGuests,
        bedrooms || 1, bathrooms || 1, JSON.stringify(amenities || []),
        JSON.stringify(houseRules || []), JSON.stringify(images),
        instantBook || false, checkInTime || '15:00', checkOutTime || '11:00',
        cancellationPolicy || 'moderate'
      ]);

      const property = propertyResult.rows[0]!;

      // Update user to be a host
      await client.query(
        'UPDATE users SET is_host = true WHERE id = $1',
        [hostId]
      );

      return this.formatProperty(property);
    });
  }

  // Get property by ID
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
    const result = await query<{
      id: string;
      host_id: string;
      title: string;
      description: string;
      property_type: string;
      address: string;
      city: string;
      state: string | null;
      country: string;
      latitude: number | null;
      longitude: number | null;
      price_per_night: string;
      cleaning_fee: string;
      service_fee_percentage: string;
      max_guests: number;
      bedrooms: number;
      bathrooms: number;
      amenities: any;
      house_rules: any;
      images: any;
      is_active: boolean;
      instant_book: boolean;
      check_in_time: string;
      check_out_time: string;
      cancellation_policy: string;
      created_at: Date;
      updated_at: Date;
      host_first_name: string;
      host_last_name: string;
      host_profile_image: string | null;
      host_joined_date: Date;
      average_rating: string;
      review_count: string;
    }>(`
      SELECT 
        p.*,
        u.first_name as host_first_name,
        u.last_name as host_last_name,
        u.profile_image as host_profile_image,
        u.created_at as host_joined_date,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as review_count
      FROM properties p
      JOIN users u ON p.host_id = u.id
      LEFT JOIN reviews r ON p.id = r.property_id
      WHERE p.id = $1 AND p.is_active = true
      GROUP BY p.id, u.first_name, u.last_name, u.profile_image, u.created_at
    `, [propertyId]);

    if (result.rows.length === 0) {
      throw new Error('Property not found');
    }

    const property = result.rows[0]!;
    
    // Check if user is the host
    const isOwner = userId ? property.host_id === userId : false;

    return {
      ...this.formatProperty(property),
      host: {
        firstName: property.host_first_name,
        lastName: property.host_last_name,
        profileImage: property.host_profile_image || undefined,
        joinedDate: property.host_joined_date
      },
      averageRating: parseFloat(property.average_rating),
      reviewCount: parseInt(property.review_count),
      isOwner
    };
  }

  // Search properties
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

    let whereConditions = ['p.is_active = true'];
    let queryParams: any[] = [];
    let paramCount = 0;

    // Build dynamic WHERE clause
    if (city) {
      paramCount++;
      whereConditions.push(`LOWER(p.city) LIKE LOWER($${paramCount})`);
      queryParams.push(`%${city}%`);
    }

    if (country) {
      paramCount++;
      whereConditions.push(`LOWER(p.country) LIKE LOWER($${paramCount})`);
      queryParams.push(`%${country}%`);
    }

    if (guests) {
      paramCount++;
      whereConditions.push(`p.max_guests >= $${paramCount}`);
      queryParams.push(guests);
    }

    if (minPrice) {
      paramCount++;
      whereConditions.push(`p.price_per_night >= $${paramCount}`);
      queryParams.push(minPrice);
    }

    if (maxPrice) {
      paramCount++;
      whereConditions.push(`p.price_per_night <= $${paramCount}`);
      queryParams.push(maxPrice);
    }

    if (propertyType) {
      paramCount++;
      whereConditions.push(`p.property_type = $${paramCount}`);
      queryParams.push(propertyType);
    }

    if (instantBook !== undefined) {
      paramCount++;
      whereConditions.push(`p.instant_book = $${paramCount}`);
      queryParams.push(instantBook);
    }

    // Check availability if dates provided
    if (checkIn && checkOut) {
      whereConditions.push(`
        NOT EXISTS (
          SELECT 1 FROM bookings b 
          WHERE b.property_id = p.id 
          AND b.status IN ('paid', 'confirmed', 'checked_in')
          AND (
            (b.check_in <= $${paramCount + 1} AND b.check_out > $${paramCount + 1}) OR
            (b.check_in < $${paramCount + 2} AND b.check_out >= $${paramCount + 2}) OR
            (b.check_in >= $${paramCount + 1} AND b.check_out <= $${paramCount + 2})
          )
        )
      `);
      queryParams.push(checkIn, checkOut);
      paramCount += 2;
    }

    // Amenities filter
    if (amenities && amenities.length > 0) {
      paramCount++;
      whereConditions.push(`p.amenities @> $${paramCount}::jsonb`);
      queryParams.push(JSON.stringify(amenities));
    }

    // Pagination
    const offset = (page - 1) * limit;
    paramCount += 2;
    queryParams.push(limit, offset);

    const whereClause = whereConditions.join(' AND ');

    // Main query
    const searchQuery = `
      SELECT 
        p.*,
        u.first_name as host_first_name,
        u.last_name as host_last_name,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as review_count
      FROM properties p
      JOIN users u ON p.host_id = u.id
      LEFT JOIN reviews r ON p.id = r.property_id
      WHERE ${whereClause}
      GROUP BY p.id, u.first_name, u.last_name
      ORDER BY p.created_at DESC
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
    `;

    // Count query for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM properties p
      JOIN users u ON p.host_id = u.id
      WHERE ${whereClause}
    `;

    const [searchResult, countResult] = await Promise.all([
      query(searchQuery, queryParams),
      query(countQuery, queryParams.slice(0, -2)) // Remove limit and offset for count
    ]);

    const properties = searchResult.rows.map(property => ({
      ...this.formatProperty(property),
      host: {
        firstName: property.host_first_name,
        lastName: property.host_last_name
      },
      averageRating: parseFloat(property.average_rating),
      reviewCount: parseInt(property.review_count)
    }));

    const total = parseInt(countResult.rows[0]?.total || '0');
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
    const result = await query<any>(`
      SELECT 
        p.*,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as review_count,
        COUNT(DISTINCT b.id) as total_bookings
      FROM properties p
      LEFT JOIN reviews r ON p.id = r.property_id
      LEFT JOIN bookings b ON p.id = b.property_id AND b.status IN ('completed')
      WHERE p.host_id = $1
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `, [hostId]);

    return result.rows.map(property => ({
      ...this.formatProperty(property),
      averageRating: parseFloat(property.average_rating),
      reviewCount: parseInt(property.review_count),
      totalBookings: parseInt(property.total_bookings)
    }));
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

    const result = await query<any>(`
      UPDATE properties SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        price_per_night = COALESCE($3, price_per_night),
        cleaning_fee = COALESCE($4, cleaning_fee),
        max_guests = COALESCE($5, max_guests),
        amenities = COALESCE($6, amenities),
        house_rules = COALESCE($7, house_rules),
        images = COALESCE($8, images),
        instant_book = COALESCE($9, instant_book),
        check_in_time = COALESCE($10, check_in_time),
        check_out_time = COALESCE($11, check_out_time),
        cancellation_policy = COALESCE($12, cancellation_policy),
        is_active = COALESCE($13, is_active),
        updated_at = NOW()
      WHERE id = $14 AND host_id = $15
      RETURNING *
    `, [
      title, description, pricePerNight, cleaningFee, maxGuests,
      amenities ? JSON.stringify(amenities) : null,
      houseRules ? JSON.stringify(houseRules) : null,
      images ? JSON.stringify(images) : null,
      instantBook, checkInTime, checkOutTime, cancellationPolicy,
      isActive, propertyId, hostId
    ]);

    if (result.rows.length === 0) {
      throw new Error('Property not found or unauthorized');
    }

    return this.formatProperty(result.rows[0]);
  }

  // Delete property
  async deleteProperty(propertyId: string, hostId: string): Promise<{ id: string; deleted: boolean }> {
    return await transaction(async (client) => {
      // Check for active bookings
      const activeBookings = await client.query(
        'SELECT id FROM bookings WHERE property_id = $1 AND status IN ($2, $3, $4)',
        [propertyId, 'paid', 'confirmed', 'checked_in']
      );

      if (activeBookings.rows.length > 0) {
        throw new Error('Cannot delete property with active bookings');
      }

      // Soft delete the property
      const result = await client.query(
        'UPDATE properties SET is_active = false WHERE id = $1 AND host_id = $2 RETURNING id',
        [propertyId, hostId]
      );

      if (result.rows.length === 0) {
        throw new Error('Property not found or unauthorized');
      }

      return { id: propertyId, deleted: true };
    });
  }

  // Check property availability
  async checkAvailability(propertyId: string, checkIn: string, checkOut: string): Promise<boolean> {
    const result = await query<{ is_available: boolean }>(`
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
    `, [propertyId, checkIn, checkOut]);

    return result.rows[0]?.is_available || false;
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
      latitude: property.latitude || undefined,
      longitude: property.longitude || undefined,
      pricePerNight: parseFloat(property.price_per_night),
      cleaningFee: parseFloat(property.cleaning_fee),
      serviceFeePercentage: parseFloat(property.service_fee_percentage),
      maxGuests: property.max_guests,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      amenities: property.amenities,
      houseRules: property.house_rules,
      images: property.images,
      isActive: property.is_active,
      instantBook: property.instant_book,
      checkInTime: property.check_in_time,
      checkOutTime: property.check_out_time,
      cancellationPolicy: property.cancellation_policy,
      createdAt: property.created_at,
      updatedAt: property.updated_at
    };
  }
}

export default new PropertyService();