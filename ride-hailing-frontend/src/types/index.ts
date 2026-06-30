export interface Driver {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
  status?: string;
}

export interface Ride {
  id: string;
  rider_id: string;
  status: string;
  assigned_driver_id?: string;
  pickup_lat: number;
  pickup_lng: number;
  drop_lat?: number;
  drop_lng?: number;
  estimated_fare?: number;
  eta_minutes?: number;
  distance_km?: number;
  fare?: number;
}
