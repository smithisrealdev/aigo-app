// Shared input validation using Zod for edge functions
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// Common response helper for validation errors
export function validationErrorResponse(error: z.ZodError, corsHeaders: Record<string, string>) {
  const formattedErrors = error.errors.map(e => ({
    field: e.path.join('.'),
    message: e.message,
  }));
  
  return new Response(
    JSON.stringify({ 
      error: 'Invalid input', 
      details: formattedErrors 
    }),
    { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

// Trip Summary Schema (extracted from conversation)
export const tripSummarySchema = z.object({
  destination: z.string().max(200).optional().nullable(),
  destinations: z.array(z.string()).optional().nullable(),
  duration: z.number().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  budget: z.object({
    amount: z.number(),
    currency: z.string(),
  }).optional().nullable(),
  travelers: z.object({
    count: z.number().optional(),
    type: z.string().optional(),
    hasChildren: z.boolean().optional(),
    hasElderly: z.boolean().optional(),
  }).optional().nullable(),
  tripStyle: z.array(z.string()).optional().nullable(),
  preferences: z.array(z.string()).optional().nullable(),
  restrictions: z.array(z.string()).optional().nullable(),
  dietaryRestrictions: z.array(z.string()).optional().nullable(),
  mustVisit: z.array(z.string()).optional().nullable(),
  mustAvoid: z.array(z.string()).optional().nullable(),
  specialInterests: z.array(z.string()).optional().nullable(),
  season: z.string().optional().nullable(),
}).optional().nullable();

// Generate Itinerary Schema
export const generateItinerarySchema = z.object({
  destination: z.string().min(1, 'Destination is required').max(200, 'Destination too long'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid start date format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid end date format (YYYY-MM-DD)'),
  budget: z.string().max(100).optional().nullable(),
  tripStyle: z.string().max(100).optional().nullable(),
  travelers: z.string().max(200).optional().nullable(),
  specialRequirements: z.string().max(1000).optional().nullable(),
  conversationContext: z.string().max(50000).optional().nullable(),
  // Full conversation messages for Two-Pass generation:
  // Claude reads these to create a detailed outline, then Gemini formats to JSON
  conversationMessages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(50000),
  })).max(100).optional().nullable(),
  // Pre-computed itinerary outline from trip-chat (Claude's detailed day-by-day plan)
  // This replaces Two-Pass: outline is generated during chat phase, not in this function
  itineraryOutline: z.string().max(50000).optional().nullable(),
  // FIX #7: Accept language from frontend for localized itinerary generation
  language: z.string().max(10).optional().nullable(),
  lang: z.string().max(10).optional().nullable(),
  tripSummary: tripSummarySchema,
  // Continue a trip whose first days came from an earlier call (each call must finish inside the edge function time limit)
  fromDay: z.number().int().min(1).max(60).optional(),
  planned: z.string().max(4000).optional().nullable(),
});

// Allowed OpenRouter model IDs for trip chat
const ALLOWED_CHAT_MODELS = [
  'deepseek/deepseek-v3.2',
  'google/gemini-3-flash-preview',
  'google/gemini-3.1-flash-lite-preview',
  'google/gemini-3.1-pro-preview',
  'openai/gpt-5.4',
  'anthropic/claude-sonnet-4.6',
  'anthropic/claude-haiku-4-5',
  'anthropic/claude-opus-4.6',
] as const;

// Trip Chat Schema
export const tripChatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().max(50000, 'Message content too long'),
  })).min(1, 'At least one message required').max(100, 'Too many messages'),
  model: z.enum(ALLOWED_CHAT_MODELS).optional(),
  tripInfo: z.object({
    destination: z.string().max(200).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    budget: z.string().max(100).optional(),
    tripStyle: z.string().max(100).optional(),
    travelers: z.string().max(200).optional(),
    specialRequirements: z.string().max(1000).optional(),
    travelPeriod: z.string().max(100).optional(),
    numberOfDays: z.number().optional(),
    origin: z.string().max(200).optional(),
  }).optional().nullable(),
  userLanguage: z.string().max(10).optional().nullable(),
  userTimezone: z.string().max(50).optional().nullable(),
  userPreferences: z.object({
    travel_style: z.array(z.string().max(50)).max(10).optional(),
    budget_level: z.string().max(50).optional().nullable(),
    dietary_restrictions: z.array(z.string().max(50)).max(10).optional(),
    accessibility_needs: z.array(z.string().max(50)).max(10).optional(),
    interests: z.array(z.string().max(50)).max(20).optional(),
    travel_pace: z.string().max(50).optional().nullable(),
    accommodation_type: z.string().max(50).optional().nullable(),
    languages_spoken: z.array(z.string().max(10)).max(15).optional(),
  }).optional().nullable(),
});

// Itinerary Chat Schema
export const itineraryChatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().max(50000, 'Message content too long'),
  })).min(1, 'At least one message required').max(100, 'Too many messages'),
  model: z.enum(ALLOWED_CHAT_MODELS).optional(),
  tripContext: z.string().max(100000, 'Trip context too long').optional().nullable(),
  destination: z.string().max(200).optional().nullable(),
  // Recently deleted places for AI restoration context
  deletedPlaces: z.array(z.object({
    name: z.string(),
    fromDay: z.number(),
    fromIndex: z.number(),
    category: z.string().optional(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),
    deletedAt: z.string().optional(),
  })).max(10).optional().nullable(),
  // Personalization fields
  userLanguage: z.string().max(10).optional().nullable(),
  travelStyle: z.string().max(100).optional().nullable(),
  travelers: z.string().max(200).optional().nullable(),
});

// Search Activities Schema (Amadeus Tours & Activities)
export const searchActivitiesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().min(1).max(100).optional(),
  query: z.string().max(200).optional(),
  currency: z.string().length(3).regex(/^[A-Za-z]{3}$/).optional(),
  maxResults: z.number().int().min(1).max(30).optional(),
});

// Search Booking Schema
export const searchBookingSchema = z.object({
  placeName: z.string().min(1, 'Place name is required').max(200, 'Place name too long'),
  placeAddress: z.string().max(500).optional().nullable(),
  activityType: z.string().max(100).optional().nullable(),
  forceRefresh: z.boolean().optional(),
});

// Place Details Schema
export const placeDetailsSchema = z.object({
  placeName: z.string().min(1, 'Place name is required').max(200, 'Place name too long'),
  placeAddress: z.string().max(500).optional().nullable(),
});

// Cache Image Schema
export const cacheImageSchema = z.object({
  imageUrl: z.string().url('Invalid image URL').max(2000, 'URL too long'),
  placeName: z.string().max(200).optional().nullable(),
  destination: z.string().max(200).optional().nullable(),
});

// Voice to Text Schema
export const voiceToTextSchema = z.object({
  audio: z.string().min(1, 'Audio data is required'),
});

// Smart Replan Schema
export const smartReplanSchema = z.object({
  issue: z.string().min(1, 'Issue description is required').max(2000, 'Issue too long'),
  currentItinerary: z.any(), // Complex structure, validate at runtime
  affectedDay: z.number().int().min(1).max(30).optional(),
});

// Nearby Places Schema
export const nearbyPlacesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  type: z.string().max(50).optional(),
  radius: z.number().int().min(100).max(50000).optional(),
});

// Geocode Place Schema
export const geocodePlaceSchema = z.object({
  address: z.string().min(1, 'Address is required').max(500, 'Address too long'),
});

// Calculate Travel Schema
export const calculateTravelSchema = z.object({
  origin: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  destination: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  mode: z.enum(['driving', 'walking', 'transit', 'bicycling']).optional(),
});

// Weather Schema
export const weatherSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  city: z.string().max(200).optional(),
});

// Google Search Schema
export const googleSearchSchema = z.object({
  query: z.string().min(1, 'Query is required').max(500, 'Query too long'),
  num: z.number().int().min(1).max(10).optional(),
});

// Place Mentions Schema
export const placeMentionsSchema = z.object({
  content: z.string().min(1).max(100000, 'Content too long'),
  destination: z.string().max(200).optional(),
});

// Social Media Search Schema
export const socialMediaSearchSchema = z.object({
  destination: z.string().min(1, 'Destination is required').max(200),
  tripStyle: z.string().max(100).optional(),
});

// Video Thumbnail Schema
export const videoThumbnailSchema = z.object({
  videoUrl: z.string().url('Invalid video URL').max(500),
  platform: z.string().max(50).optional(),
});

// Image Proxy Schema
export const imageProxySchema = z.object({
  url: z.string().url('Invalid image URL').max(2000),
});

// Search Flights Schema
export const searchFlightsSchema = z.object({
  origin: z.string().min(3).max(5, 'Invalid airport code'),
  destination: z.string().min(3).max(5, 'Invalid airport code'),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  adults: z.number().int().min(1).max(9).optional(),
  travelClass: z.string().max(20).optional(),
  nonStop: z.boolean().optional(),
  maxPrice: z.number().int().min(1).optional(),
});

// Search Hotels Schema
export const searchHotelsSchema = z.object({
  cityCode: z.string().min(3).max(5, 'Invalid city code'),
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  adults: z.number().int().min(1).max(9).optional(),
  roomQuantity: z.number().int().min(1).max(9).optional(),
  priceRange: z.string().max(50).optional(),
  ratings: z.array(z.number().int().min(1).max(5)).optional(),
  maxResults: z.number().int().min(1).max(100).optional(),
});

export { z };

