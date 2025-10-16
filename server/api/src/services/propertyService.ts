import { Database } from '../database/supabase';
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Transaction } from '@solana/web3.js';
import { CreatePropertyRequest, Property } from '../types';
import { OpenStayProgram, PRICE_LAMPORTS } from '../solana_provider/solanaProvider';

class PropertyService {

  async createProperty(hostId: string, propertyData: CreatePropertyRequest, connection: anchor.web3.Connection): Promise<{
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
      if (!property || !property.id) throw new Error('DB insert failed');
    } catch (dbError) {
      console.error('❌ DB insert failed:', dbError);
      throw new Error('Failed to save property metadata.');
    }

    const newPropertyId: string = property.id;

    // 2️⃣ Convert DB property ID to 16-byte array
    const propertyIdBytes = Buffer.from(newPropertyId.replace(/-/g, '').substring(0, 32), 'hex');
    if (propertyIdBytes.length !== 16) {
      throw new Error('Property ID must be 16 bytes for Solana.');
    }

    // 3️⃣ Derive listing PDA
    const [listingPda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from('listing'), new PublicKey(hostPublicKey).toBuffer()],
      OpenStayProgram.programId
    );

    console.log('✅ Listing PDA:', listingPda.toBase58());
    console.log('🔑 Host Public Key:', hostPublicKey);

    // 4️⃣ Build unsigned transaction for front-end signing
    const instruction = await OpenStayProgram.methods
      .createListing(new anchor.BN(PRICE_LAMPORTS), propertyIdBytes)
      .accounts({
        listing: listingPda,
        host: new PublicKey(hostPublicKey),
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .instruction(); // return Instruction, not rpc()

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = new PublicKey(hostPublicKey);
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const serializedTransaction = transaction.serializeMessage().toString('base64');

    // 5️⃣ Update DB with Solana PDA info
    await Database.update('properties', { listing_pda: listingPda.toBase58(), bump }, { id: newPropertyId });
    await Database.update('users', { is_host: true }, { id: hostId });

    return {
      property: this.formatProperty({ ...property, listing_pda: listingPda.toBase58(), bump }),
      listingPda: listingPda.toBase58(),
      bump,
      serializedTransaction
    };
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
      updatedAt: new Date(property.updated_at),
      averageRating: property.average_rating !== undefined ? Math.round(parseFloat(property.average_rating) * 10) / 10 : 0,
      reviewCount: property.review_count !== undefined ? parseInt(property.review_count) : 0
    };
  }
}

export default new PropertyService();
