
export interface Item {
    quantity: number;
    item: string;
    value: number;
}

export interface Order {
    notes?: string;
    postalCode: string;
    isPaid: boolean;
    address1: string;
    address2?: string;
    total: number;
    total_with_tax: number;
    state: string;
    items: Item[];
    currency: string;
    taxes: { [key: string]: number }[];
    locale: string;
    shop: string;
    city: string;
    country: string;
    user: string;
    delivered: boolean;
}