import { IOrder } from '../models/Order';
import axios from 'axios';
import logger from '../utils/logger';

export interface GrubTechWebhookPayload {
  id: string;
  invoiceNo: null;
  storeId: string;
  menuId: string;
  displayId: string;
  brand: {
    name: string;
    id: string;
    $type: "Brand";
  };
  kitchen: {
    name: string;
    id: string;
    $type: "Kitchen";
  };
  type: "PICK_UP";
  instructions: null;
  delivery: {
    receiverName: string;
    receiverMobileNumber: null;
    location: {
      address: string;
      latitude: string;
      longitude: string;
      $type: "Location";
    };
    notes: null;
    $type: "Delivery";
  };
  customer: {
    name: string;
    contactNumber: string | null;
    email: string | null;
    $type: "Customer";
  };
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: {
      unitPrice: {
        amount: number;
        currencyCode: "AED";
        formattedAmount: string;
        $type: "UnitPrice";
      };
      discountAmount: {
        amount: number;
        currencyCode: "AED";
        formattedAmount: string;
        $type: "DiscountAmount";
      };
      taxAmount: {
        amount: number;
        currencyCode: "AED";
        formattedAmount: string;
        $type: "TaxAmount";
      };
      totalPrice: {
        amount: number;
        currencyCode: "AED";
        formattedAmount: string;
        $type: "TotalPrice";
      };
      $type: "Price";
    };
    modifiers: Array<{
      id: string;
      name: string;
      quantity: number;
      price: {
        unitPrice: {
          amount: number;
          currencyCode: "AED";
          formattedAmount: string;
          $type: "UnitPrice";
        };
        discountAmount: {
          amount: number;
          currencyCode: "AED";
          formattedAmount: string;
          $type: "DiscountAmount";
        };
        taxAmount: {
          amount: number;
          currencyCode: "AED";
          formattedAmount: string;
          $type: "TaxAmount";
        };
        totalPrice: {
          amount: number;
          currencyCode: "AED";
          formattedAmount: string;
          $type: "TotalPrice";
        };
        $type: "Price";
      };
      $type: "Modifier";
    }>;
    instructions: null;
    $type: "Item";
  }>;
  payment: {
    status: "POSTPAID";
    method: "POSTPAID";
    charges: {
      subTotal: {
        amount: number;
        currencyCode: "AED";
        formattedAmount: string;
        $type: "SubTotal";
      };
      total: {
        amount: number;
        currencyCode: "AED";
        formattedAmount: string;
        $type: "Total";
      };
      deliveryFee: {
        amount: 0;
        currencyCode: "AED";
        formattedAmount: "AED0.00";
        $type: "DeliveryFee";
      };
      $type: "Charges";
    };
    discounts: [];
    tax: Array<{
      amount: {
        amount: number;
        currencyCode: "AED";
        formattedAmount: string;
        $type: "Amount";
      };
      name: string;
      $type: "Tax";
    }>;
    $type: "Payment";
  };
  source: {
    name: string;
    uniqueOrderId: string;
    placedAt: string;
    channel: string;
    $type: "Source";
  };
  scheduledOrder: null;
  status: "OrderAccepted";
  placedAt: string;
  additionalInfo: {
    shortCode: null;
    $type: "AdditionalInfo";
  };
  externalReferenceId: string | null;
  external_id?: string;
  $type: "WebhookPayload";
}

export class GrubTechWebhookService {
  private static readonly GRUBTECH_WEBHOOK_URL = process.env.GRUBTECH_WEBHOOK_URL || 'https://novogt.achievengine.com';
  private static readonly GRUBTECH_API_KEY = process.env.GRUBTECH_API_KEY || 'eae37b0e-950b-4e92-abcc-d0b310326f67';
  private static readonly CURRENCY_CODE = 'AED';

  static async sendOrderToGrubTech(order: any, business: any, user?: any): Promise<void> {
    try {
      const payload = this.transformOrderToGrubTechPayload(order, business, user);
      
      logger.info('Sending order to GrubTech', { 
        orderId: order._id, 
        orderNumber: order.orderNumber 
      });

      const response = await axios.post(this.GRUBTECH_WEBHOOK_URL, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.GRUBTECH_API_KEY,
          'User-Agent': 'INSEAT-Webhook/1.0'
        },
        timeout: 30000
      });

      if (response.status >= 200 && response.status < 300) {
        logger.info('Successfully sent order to GrubTech', { 
          orderId: order._id, 
          status: response.status 
        });
      } else {
        throw new Error(`GrubTech responded with status: ${response.status}`);
      }

    } catch (error: any) {
      logger.error('Failed to send order to GrubTech', { 
        orderId: order._id, 
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  private static transformOrderToGrubTechPayload(
    order: any, 
    business: any, 
    user?: any
  ): GrubTechWebhookPayload {
    const now = new Date().toISOString();
    
    return {
      id: order._id.toString(),
      invoiceNo: null,
      storeId: order.restaurantId.toString(),
      menuId: order.items[0]?.menuItem?.toString() || order.restaurantId.toString(),
      displayId: order.orderNumber,
      brand: {
        name: business.name,
        id: business._id.toString(),
        $type: "Brand"
      },
      kitchen: {
        name: business.name,
        id: business._id.toString(),
        $type: "Kitchen"
      },
      type: "PICK_UP",
      instructions: null,
      delivery: {
        receiverName: "INSEAT",
        receiverMobileNumber: null,
        location: {
          address: order.tableNumber ? `Table No: ${order.tableNumber}` : "Table TBD",
          latitude: "25.0757595",
          longitude: "54.947304",
          $type: "Location"
        },
        notes: null,
        $type: "Delivery"
      },
      customer: {
        name: user?.name || "Guest",
        contactNumber: user?.phone || null,
        email: user?.email || null,
        $type: "Customer"
      },
      items: this.transformOrderItems(order.items),
      payment: {
        status: "POSTPAID",
        method: "POSTPAID",
        charges: {
          subTotal: {
            amount: Math.round(order.subtotal * 100),
            currencyCode: this.CURRENCY_CODE,
            formattedAmount: `${this.CURRENCY_CODE}${order.subtotal.toFixed(2)}`,
            $type: "SubTotal"
          },
          total: {
            amount: Math.round(order.total * 100),
            currencyCode: this.CURRENCY_CODE,
            formattedAmount: `${this.CURRENCY_CODE}${order.total.toFixed(2)}`,
            $type: "Total"
          },
          deliveryFee: {
            amount: 0,
            currencyCode: this.CURRENCY_CODE,
            formattedAmount: `${this.CURRENCY_CODE}0.00`,
            $type: "DeliveryFee"
          },
          $type: "Charges"
        },
        discounts: [],
        tax: [{
          amount: {
            amount: Math.round(order.tax * 100),
            currencyCode: this.CURRENCY_CODE,
            formattedAmount: `${this.CURRENCY_CODE}${order.tax.toFixed(2)}`,
            $type: "Amount"
          },
          name: "VAT",
          $type: "Tax"
        }],
        $type: "Payment"
      },
      source: {
        name: "INSEAT",
        uniqueOrderId: `${order._id.toString()}:${Date.now()}`,
        placedAt: now,
        channel: "INSEAT",
        $type: "Source"
      },
      scheduledOrder: null,
      status: "OrderAccepted",
      placedAt: order.createdAt.toISOString(),
      additionalInfo: {
        shortCode: null,
        $type: "AdditionalInfo"
      },
      externalReferenceId: order._id.toString(),
      external_id: order._id.toString(),
      $type: "WebhookPayload"
    };
  }

  private static transformOrderItems(items: any[]): GrubTechWebhookPayload['items'] {
    return items.map(item => ({
      id: item.menuItem?.toString() || item._id.toString(),
      name: item.name,
      quantity: item.quantity,
      price: {
        unitPrice: {
          amount: Math.round(item.price * 100),
          currencyCode: this.CURRENCY_CODE,
          formattedAmount: `${this.CURRENCY_CODE}${item.price.toFixed(2)}`,
          $type: "UnitPrice"
        },
        discountAmount: {
          amount: 0,
          currencyCode: this.CURRENCY_CODE,
          formattedAmount: `${this.CURRENCY_CODE}0.00`,
          $type: "DiscountAmount"
        },
        taxAmount: {
          amount: 0,
          currencyCode: this.CURRENCY_CODE,
          formattedAmount: `${this.CURRENCY_CODE}0.00`,
          $type: "TaxAmount"
        },
        totalPrice: {
          amount: Math.round(item.subtotal * 100),
          currencyCode: this.CURRENCY_CODE,
          formattedAmount: `${this.CURRENCY_CODE}${item.subtotal.toFixed(2)}`,
          $type: "TotalPrice"
        },
        $type: "Price"
      },
      modifiers: this.transformModifiers(item.modifiers || []),
      instructions: item.specialInstructions || null,
      $type: "Item"
    }));
  }

  private static transformModifiers(modifiers: any[]): GrubTechWebhookPayload['items'][0]['modifiers'] {
    const result: GrubTechWebhookPayload['items'][0]['modifiers'] = [];
    
    modifiers.forEach(modifierGroup => {
      modifierGroup.selections?.forEach((selection: any) => {
        result.push({
          id: selection.optionId?.toString() || selection._id?.toString() || 'unknown',
          name: selection.name,
          quantity: selection.quantity,
          price: {
            unitPrice: {
              amount: Math.round(selection.price * 100),
              currencyCode: this.CURRENCY_CODE,
              formattedAmount: `${this.CURRENCY_CODE}${selection.price.toFixed(2)}`,
              $type: "UnitPrice"
            },
            discountAmount: {
              amount: 0,
              currencyCode: this.CURRENCY_CODE,
              formattedAmount: `${this.CURRENCY_CODE}0.00`,
              $type: "DiscountAmount"
            },
            taxAmount: {
              amount: 0,
              currencyCode: this.CURRENCY_CODE,
              formattedAmount: `${this.CURRENCY_CODE}0.00`,
              $type: "TaxAmount"
            },
            totalPrice: {
              amount: Math.round((selection.price * selection.quantity) * 100),
              currencyCode: this.CURRENCY_CODE,
              formattedAmount: `${this.CURRENCY_CODE}${(selection.price * selection.quantity).toFixed(2)}`,
              $type: "TotalPrice"
            },
            $type: "Price"
          },
          $type: "Modifier"
        });
      });
    });

    return result;
  }

  static validateWebhookConfig(): boolean {
    if (!this.GRUBTECH_WEBHOOK_URL) {
      logger.error('GRUBTECH_WEBHOOK_URL environment variable is not set');
      return false;
    }
    
    if (!this.GRUBTECH_API_KEY) {
      logger.error('GRUBTECH_API_KEY environment variable is not set');
      return false;
    }
    
    try {
      new URL(this.GRUBTECH_WEBHOOK_URL);
      return true;
    } catch (error) {
      logger.error('Invalid GRUBTECH_WEBHOOK_URL format', { url: this.GRUBTECH_WEBHOOK_URL });
      return false;
    }
  }
}