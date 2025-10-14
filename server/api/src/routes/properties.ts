import express, { Request, Response } from 'express';
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import propertyService from '../services/propertyService';
import { 
  ApiResponse, 
  CreatePropertyRequest, 
  UpdatePropertyRequest, 
  SearchPropertiesRequest,
  AuthenticatedRequest 
} from '../types';

import { SolBnbEscrow } from "../sol_bnb_escrow/types/sol_bnb_escrow";
import { Database } from "../database/supabase";

const router = express.Router();

// --- Solana / Anchor setup ---
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const program = anchor.workspace.SolBnbEscrow as Program<SolBnbEscrow>;

// --- Constants ---
const PRICE_LAMPORTS = new anchor.BN(1_000_000_000); // default 1 SOL

// --- Helpers ---
function getListingPda(hostPublicKey: anchor.web3.PublicKey) {
  const [listingPda, listingBump] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("listing"), hostPublicKey.toBuffer()],
    program.programId
  );
  return { listingPda, listingBump };
}

function getEscrowPda(listingPda: anchor.web3.PublicKey) {
  const [escrowPda, escrowBump] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), listingPda.toBuffer()],
    program.programId
  );
  return { escrowPda, escrowBump };
}




// @route   POST /api/listings/:id/reserve
// @desc    Reserve a property
// @access  Guests only
router.post('/listings/:id/reserve', async (req: AuthenticatedRequest<{ id: string, guestPublicKey:string, listingPda:string}, ApiResponse, { checkIn: string; checkOut: string }>, res: Response<ApiResponse>) => {
  try {
    const guestId = req.user.id;
    if (req.user.isHost) {
      return res.status(403).json({ success: false, message: 'Hosts cannot make bookings' });
    }

    const propertyId = Number(req.params.id);
    const { checkIn, checkOut } = req.body;

    // Validate dates
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    if (checkOutDate <= checkInDate) {
      return res.status(400).json({ success: false, message: 'Check-out date must be after check-in date' });
    }

    // Check availability
    const isAvailable = await propertyService.checkAvailability(propertyId, checkInDate, checkOutDate);
    if (!isAvailable) {
      return res.status(400).json({ success: false, message: 'Property is not available for these dates' });
    }

    // Create booking
    const booking = await propertyService.createBooking(propertyId, guestId, checkInDate, checkOutDate);
    const listingPda = new anchor.web3.PublicKey(req.params.listingPda);
    const { guestPublicKey } = req.body;
    const guestKey = new anchor.web3.PublicKey(guestPublicKey);

    // Fetch listing account
    const listing = await program.account.listing.fetch(listingPda);
    if (listing.isBooked) {
      return res.status(400).json({ error: "AlreadyBooked" });
    }

    const { escrowPda } = getEscrowPda(listingPda);
    res.json({
      listingPda: listingPda.toBase58(),
      escrowPda: escrowPda.toBase58(),
      host: listing.host.toBase58(),
      price: listing.priceLamports.toNumber(),
      programId: program.programId.toBase58(),
      message: "Book listing by signing transaction on frontend.",
    });
  } catch (error) {
    console.error('Reserve property error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Failed to reserve property', error: process.env.NODE_ENV === 'development' ? errorMessage : undefined });
  }
});
// @route   POST /api/listings
// @desc    Create a new property listing
// @access  Hosts only
router.post('/listings', async (req: Request<CreatePropertyRequest>, res: Response<ApiResponse>) => {
  try {

    const propertyData = req.body;
    const newProperty = await propertyService.createProperty(propertyData.id, propertyData);
    // TODO: need to add the solana logic here that does the stuff on the backend to also create a property listing on the chain 
    const { hostPublicKey, price, metadataUri } = req.body;

    const hostKey = new anchor.web3.PublicKey(hostPublicKey);
    const { listingPda } = getListingPda(hostKey);
    res.json({
      listingPda: listingPda.toBase58(),
      programId: program.programId.toBase58(),
      price: price || PRICE_LAMPORTS.toNumber(),
      metadataUri,
      message: "Listing prepared. Sign transaction on frontend to create on-chain.",
    });
  } catch (error) {
    console.error('Create property error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to create property',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    });
  }
});

router.get('/listings', async (req:Request, res: Response<ApiResponse>) => {
  try 
  { var properties = propertyService.getAllProperties(); 
    res.json({
      success: true,
      data: properties
    });
  } catch (error) {
    console.error('Get properties error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    res.status(500).json({
      success: false,
      message: 'Failed to get properties',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }

// @route   GET /api/properties/:id
// @desc    Get property details by ID
// @access  Public (with optional auth for ownership check)
router.get('/listings/:id', async (req: Request<{ id: string }>, res: Response<ApiResponse>) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.id;
    const property = await propertyService.getPropertyById(req.params.id, userId);
    
    res.json({
      success: true,
      data: property
    });
  } catch (error) {
    console.error('Get property error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage === 'Property not found') {
      res.status(404).json({
        success: false,
        message: 'Property not found'
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Failed to get property',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});







export default router;