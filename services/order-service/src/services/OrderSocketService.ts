import { Server as SocketIOServer } from 'socket.io';

export class OrderSocketService {
  private io: SocketIOServer;

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  initialize(): void {
    this.io.on('connection', (socket) => {
      console.log('Client connected to order service');

      socket.on('join-restaurant', (restaurantId: string) => {
        socket.join(`restaurant-${restaurantId}`);
      });

      socket.on('leave-restaurant', (restaurantId: string) => {
        socket.leave(`restaurant-${restaurantId}`);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected from order service');
      });
    });
  }

  cleanup(): void {
    this.io.removeAllListeners();
  }

  // Method to emit order updates
  emitOrderUpdate(restaurantId: string, orderData: any): void {
    this.io.to(`restaurant-${restaurantId}`).emit('order-update', orderData);
  }
}

