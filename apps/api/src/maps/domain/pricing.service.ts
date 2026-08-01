export interface PricingQuoteInput {
  vehicleType: string;
  distanceMeters: number;
  stopCount: number;
}

export interface PricingQuote {
  amountVnd: number;
  currency: 'VND';
}

export interface VehiclePricingRate {
  baseFareVnd: number;
  perKmVnd: number;
}

export interface PricingConfig {
  minimumFareVnd: number;
  stopSurchargeVnd: number;
  vehicleRates: Record<string, VehiclePricingRate>;
}

export class PricingService {
  private readonly config: NormalizedPricingConfig;

  constructor(config: PricingConfig) {
    this.config = normalizePricingConfig(config);
  }

  static fromEnv(source: NodeJS.ProcessEnv = process.env): PricingService {
    return new PricingService(readPricingConfigFromEnv(source));
  }

  quote(input: PricingQuoteInput): PricingQuote {
    const vehicleType = normalizeVehicleType(input.vehicleType);
    const distanceMeters = safeNonNegativeInteger(input.distanceMeters, 'distanceMeters');
    const stopCount = safeNonNegativeInteger(input.stopCount, 'stopCount');
    const rate = this.config.vehicleRates[vehicleType];

    if (rate === undefined) {
      throw new PricingQuoteError(`Unsupported vehicle type: ${vehicleType}`);
    }

    const distanceFareVnd = Math.round((distanceMeters * rate.perKmVnd) / 1_000);
    const stopFareVnd = stopCount * this.config.stopSurchargeVnd;
    const calculatedFareVnd = rate.baseFareVnd + distanceFareVnd + stopFareVnd;

    return {
      amountVnd: Math.max(calculatedFareVnd, this.config.minimumFareVnd),
      currency: 'VND',
    };
  }
}

export class PricingConfigError extends Error {
  constructor(message = 'Pricing config is invalid') {
    super(message);
    this.name = 'PricingConfigError';
  }
}

export class PricingQuoteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PricingQuoteError';
  }
}

interface NormalizedPricingConfig {
  minimumFareVnd: number;
  stopSurchargeVnd: number;
  vehicleRates: Record<string, VehiclePricingRate>;
}

function normalizePricingConfig(config: PricingConfig): NormalizedPricingConfig {
  const minimumFareVnd = configInteger(config.minimumFareVnd);
  const stopSurchargeVnd = configInteger(config.stopSurchargeVnd);
  const entries = Object.entries(config.vehicleRates).map(([vehicleType, rate]) => {
    const normalizedVehicleType = normalizeVehicleType(vehicleType);

    return [
      normalizedVehicleType,
      {
        baseFareVnd: configInteger(rate.baseFareVnd),
        perKmVnd: configInteger(rate.perKmVnd),
      },
    ] as const;
  });

  if (entries.length === 0 || minimumFareVnd === null || stopSurchargeVnd === null) {
    throw new PricingConfigError();
  }

  for (const [, rate] of entries) {
    if (rate.baseFareVnd === null || rate.perKmVnd === null) {
      throw new PricingConfigError();
    }
  }

  return {
    minimumFareVnd,
    stopSurchargeVnd,
    vehicleRates: Object.fromEntries(entries) as Record<string, VehiclePricingRate>,
  };
}

function readPricingConfigFromEnv(source: NodeJS.ProcessEnv): PricingConfig {
  const ratesJson = source.PRICING_VEHICLE_RATES_JSON;

  if (ratesJson === undefined) {
    throw new PricingConfigError('Pricing config is invalid: PRICING_VEHICLE_RATES_JSON is required');
  }

  let vehicleRates: Record<string, VehiclePricingRate>;

  try {
    vehicleRates = JSON.parse(ratesJson) as Record<string, VehiclePricingRate>;
  } catch {
    throw new PricingConfigError('Pricing config is invalid: vehicle rates JSON is invalid');
  }

  return {
    minimumFareVnd: parseEnvInteger(source.PRICING_MINIMUM_FARE_VND),
    stopSurchargeVnd: parseEnvInteger(source.PRICING_STOP_SURCHARGE_VND),
    vehicleRates,
  };
}

function normalizeVehicleType(vehicleType: string): string {
  const normalizedVehicleType = vehicleType.trim().toUpperCase();

  if (normalizedVehicleType.length === 0) {
    throw new PricingConfigError();
  }

  return normalizedVehicleType;
}

function safeNonNegativeInteger(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new PricingQuoteError(`${field} must be a non-negative integer`);
  }

  return value;
}

function configInteger(value: number): number | null {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function parseEnvInteger(value: string | undefined): number {
  if (value === undefined || value.trim().length === 0) {
    throw new PricingConfigError('Pricing config is invalid: required pricing env is missing');
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new PricingConfigError();
  }

  return parsed;
}
