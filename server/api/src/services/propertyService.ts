import { Database } from '../database/supabase';
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Transaction } from '@solana/web3.js';
import { CreatePropertyRequest, Property } from '../types';
import { OpenStayProgram, PRICE_LAMPORTS } from '../solana_provider/solanaProvider';

class PropertyService {

  async createProperty(
    hostId: string, 
    propertyData: CreatePropertyRequest, 
    connection: anchor.web3.Connection
  ): Promise<{
    property: Property;
    listingPda: string;
    bump: number;
    serializedTransaction: string;
  }> {

    const {
      title, hostPublicKey, description, propertyType, address, city, state, country,
      latitude, longitude, pricePerNight, cleaningFee, maxGuests,
      bedrooms, bathrooms, amenities, houseRules, images,
      instantBook, checkInTime, checkOutTime, cancellationPolicy
    } = propertyData;

    // Validate hostPublicKey
    if (!hostPublicKey) {
      throw new Error('hostPublicKey is required');
    }

    let hostPubkey: PublicKey;
    try {
      hostPubkey = new PublicKey(hostPublicKey);
    } catch (error) {
      throw new Error('Invalid hostPublicKey format');
    }

    // 1️⃣ Insert property metadata into Supabase DB
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
      images: JSON.stringify(images || []),
      instant_book: instantBook || false,
      check_in_time: checkInTime || '15:00',
      check_out_time: checkOutTime || '11:00',
      cancellation_policy: cancellationPolicy || 'moderate',
    };

    let property: any;
    try {
      property = await Database.insert<any>('properties', propertyDbData);
      if (!property || !property.id) {
        throw new Error('DB insert failed - no property returned');
      }
    } catch (dbError) {
      console.error('❌ DB insert failed:', dbError);
      throw new Error(`Failed to save property metadata: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
    }

    const newPropertyId: string = property.id;
    console.log('✅ Property saved to DB with ID:', newPropertyId);

    // 2️⃣ Convert DB property ID (UUID) to 16-byte array
    let propertyIdBytes: Buffer;
    try {
      // Remove hyphens from UUID and take first 32 hex chars (16 bytes)
      const hexString = newPropertyId.replace(/-/g, '').substring(0, 32);
      propertyIdBytes = Buffer.from(hexString, 'hex');
      
      if (propertyIdBytes.length !== 16) {
        throw new Error(`Property ID must be exactly 16 bytes. Got ${propertyIdBytes.length} bytes`);
      }
    } catch (error) {
      console.error('❌ Property ID conversion failed:', error);
      // Rollback: delete the property from DB
      await Database.delete('properties', { id: newPropertyId });
      throw new Error('Property ID must be 16 bytes for Solana.');
    }

    // 3️⃣ Derive listing PDA
    const [listingPda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from('listing'), hostPubkey.toBuffer()],
      OpenStayProgram.programId
    );

    console.log('✅ Listing PDA:', listingPda.toBase58());
    console.log('🔑 Host Public Key:', hostPublicKey);
    console.log('🆔 Property ID (hex):', propertyIdBytes.toString('hex'));

    // 4️⃣ Build unsigned transaction for front-end signing
    try {
      const instruction = await OpenStayProgram.methods
        .createListing(new anchor.BN(PRICE_LAMPORTS), Array.from(propertyIdBytes))
        .accounts({
          listing: listingPda,
          host: hostPubkey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .instruction(); // Return instruction, not rpc()

      const transaction = new Transaction().add(instruction);
      transaction.feePayer = hostPubkey;
      
      // Get latest blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;

      // Serialize the transaction (without signatures)
      const serializedTransaction = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false
      }).toString('base64');

      console.log('✅ Transaction created and serialized');

      // 5️⃣ Update DB with Solana PDA info
      await Database.update(
        'properties', 
        { 
          listing_pda: listingPda.toBase58(), 
          bump,
          host_public_key: hostPublicKey 
        }, 
        { id: newPropertyId }
      );

      await Database.update(
        'users', 
        { is_host: true }, 
        { id: hostId }
      );

      console.log('✅ DB updated with listing PDA and bump');

      return {
        property: this.formatProperty({ 
          ...property, 
          listing_pda: listingPda.toBase58(), 
          bump,
          host_public_key: hostPublicKey 
        }),
        listingPda: listingPda.toBase58(),
        bump,
        serializedTransaction
      };

    } catch (error) {
      console.error('❌ Transaction creation failed:', error);
      // Rollback: delete the property from DB
      await Database.delete('properties', { id: newPropertyId });
      throw new Error(`Failed to create Solana transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAllProperties(): Promise<Property[]> {
    try {
      const properties = await Database.query<any>('properties');

      return properties.map(property => this.formatProperty(property));
    } catch (error) {
      console.error('❌ Get all properties failed:', error);
      throw new Error('Failed to fetch properties');
    }
  }

  async getPropertyById(propertyId: string): Promise<Property> {
    try {
      const property = await Database.queryOne<any>('properties', { id: propertyId });
      
      if (!property) {
        throw new Error('Property not found');
      }

      return this.formatProperty(property);
    } catch (error) {
      console.error('❌ Get property by ID failed:', error);
      if (error instanceof Error && error.message === 'Property not found') {
        throw error;
      }
      throw new Error('Failed to fetch property');
    }
  }


  async updateProperty(propertyId: string, updates: Partial<CreatePropertyRequest>): Promise<Property> {
    try {
      // Prepare update object
      const updateData: any = {};
      
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.propertyType !== undefined) updateData.property_type = updates.propertyType;
      if (updates.address !== undefined) updateData.address = updates.address;
      if (updates.city !== undefined) updateData.city = updates.city;
      if (updates.state !== undefined) updateData.state = updates.state;
      if (updates.country !== undefined) updateData.country = updates.country;
      if (updates.latitude !== undefined) updateData.latitude = updates.latitude;
      if (updates.longitude !== undefined) updateData.longitude = updates.longitude;
      if (updates.pricePerNight !== undefined) updateData.price_per_night = updates.pricePerNight;
      if (updates.cleaningFee !== undefined) updateData.cleaning_fee = updates.cleaningFee;
      if (updates.maxGuests !== undefined) updateData.max_guests = updates.maxGuests;
      if (updates.bedrooms !== undefined) updateData.bedrooms = updates.bedrooms;
      if (updates.bathrooms !== undefined) updateData.bathrooms = updates.bathrooms;
      if (updates.amenities !== undefined) updateData.amenities = JSON.stringify(updates.amenities);
      if (updates.houseRules !== undefined) updateData.house_rules = JSON.stringify(updates.houseRules);
      if (updates.images !== undefined) updateData.images = JSON.stringify(updates.images);
      if (updates.instantBook !== undefined) updateData.instant_book = updates.instantBook;
      if (updates.checkInTime !== undefined) updateData.check_in_time = updates.checkInTime;
      if (updates.checkOutTime !== undefined) updateData.check_out_time = updates.checkOutTime;
      if (updates.cancellationPolicy !== undefined) updateData.cancellation_policy = updates.cancellationPolicy;

      const updatedProperty = await Database.update('properties', updateData, { id: propertyId });
      
      if (!updatedProperty) {
        throw new Error('Property not found');
      }

      return this.formatProperty(updatedProperty);
    } catch (error) {
      console.error('❌ Update property failed:', error);
      throw new Error('Failed to update property');
    }
  }

  async deleteProperty(propertyId: string): Promise<void> {
    try {
      // Soft delete - set is_active to false
      await Database.update('properties', { is_active: false }, { id: propertyId });
    } catch (error) {
      console.error('❌ Delete property failed:', error);
      throw new Error('Failed to delete property');
    }
  }

  async searchProperties(filters: {
    city?: string;
    country?: string;
    minPrice?: number;
    maxPrice?: number;
    minGuests?: number;
    propertyType?: string;
  }): Promise<Property[]> {
    try {
      const query: any = { is_active: true };

      if (filters.city) query.city = filters.city;
      if (filters.country) query.country = filters.country;
      if (filters.propertyType) query.property_type = filters.propertyType;

      let properties = await Database.query<any>('properties', query);

      // Apply price and guest filters in memory (or use raw SQL for better performance)
      if (filters.minPrice !== undefined) {
        properties = properties.filter(p => parseFloat(p.price_per_night) >= filters.minPrice!);
      }
      if (filters.maxPrice !== undefined) {
        properties = properties.filter(p => parseFloat(p.price_per_night) <= filters.maxPrice!);
      }
      if (filters.minGuests !== undefined) {
        properties = properties.filter(p => p.max_guests >= filters.minGuests!);
      }

      return properties.map(property => this.formatProperty(property));
    } catch (error) {
      console.error('❌ Search properties failed:', error);
      throw new Error('Failed to search properties');
    }
  }

  private formatProperty(property: any): Property {
    return {
      id: property.id,
      hostId: property.host_id,
      hostPublicKey: property.host_public_key || '',
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
      cleaningFee: parseFloat(property.cleaning_fee || '0'),
      serviceFeePercentage: property.service_fee_percentage ? parseFloat(property.service_fee_percentage) : 10,
      maxGuests: property.max_guests,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      amenities: typeof property.amenities === 'string' ? JSON.parse(property.amenities) : property.amenities || [],
      houseRules: typeof property.house_rules === 'string' ? JSON.parse(property.house_rules) : property.house_rules || [],
      images: typeof property.images === 'string' ? JSON.parse(property.images) : property.images || [],
      isActive: property.is_active !== undefined ? property.is_active : true,
      instantBook: property.instant_book || false,
      checkInTime: property.check_in_time || '15:00',
      checkOutTime: property.check_out_time || '11:00',
      cancellationPolicy: property.cancellation_policy || 'moderate',
      createdAt: property.created_at ? new Date(property.created_at) : new Date(),
      updatedAt: property.updated_at ? new Date(property.updated_at) : new Date(),
      averageRating: property.average_rating !== undefined ? Math.round(parseFloat(property.average_rating) * 10) / 10 : 0,
      reviewCount: property.review_count !== undefined ? parseInt(property.review_count) : 0,
      listingPda: property.listing_pda || undefined,
      bump: property.bump || undefined
    };
  }
}

export default new PropertyService();