/**
 * Video Invite Helper Functions for Mobile
 * 
 * This module provides utilities for sending video call invitations through chat messages
 * to trigger notifications via the existing chat messaging system.
 */

/**
 * Creates a formatted video invite message
 * @param customMessage - Optional custom message from the user
 * @returns Formatted video invite message
 */
export function createVideoInviteMessage(customMessage?: string): string {
  const baseMessage = '📹 Video görüşme daveti gönderildi. Görüşmeye katılmak için hazır olduğunuzda haber verin!';
  
  if (customMessage && customMessage.trim()) {
    return `📹 Video görüşme daveti: ${customMessage.trim()}`;
  }
  
  return baseMessage;
}

/**
 * Sends a video invite message through a Stream chat channel
 * @param chatChannel - Stream chat channel instance
 * @param userId - ID of the user sending the invite
 * @param customMessage - Optional custom message
 * @returns Promise that resolves when message is sent
 */
export async function sendVideoInviteMessage(
  chatChannel: any, // Stream Chat Channel type
  userId: string,
  customMessage?: string
): Promise<void> {
  const message = createVideoInviteMessage(customMessage);
  
  // Use the correct Stream Chat sendMessage format
  await chatChannel.sendMessage({
    text: message,
    // Add custom data to identify this as a video invite
    custom: {
      invite_type: 'video_call',
      timestamp: new Date().toISOString()
    }
  });
  
  console.log('✅ Video invite message sent:', message);
}

/**
 * Success message for UI display after sending invite
 * @param partnerName - Name of the person who received the invite
 * @returns Success message text
 */
export function getVideoInviteSuccessMessage(partnerName: string): string {
  return `${partnerName} adlı kişiye video görüşme daveti chat mesajı olarak gönderildi. Mesaj gönderildi ve bildirim tetiklendi.`;
}
