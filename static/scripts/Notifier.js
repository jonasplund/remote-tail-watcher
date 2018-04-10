let notifierInstance = null;
class Notifier {
  constructor() {
    if (!notifierInstance) {
      notifierInstance = this;
    }
    this.mostRecentDateTime = new Date();
    return notifierInstance;
  }

  async notify(server, logError) {
    if (new Date() - this.mostRecentDateTime > 5000) {
      const notificationText = `New error on ${server}:\n${logError.exceptionClass || logError.errorType}`;
      if (Notification.permission === 'granted') {
        new Notification(notificationText);
        this.mostRecentDateTime = new Date();
      } else if (Notification.permission !== 'denied') {
        if (Notification.requestPermission() === 'granted') {
          new Notification(notificationText);
          this.mostRecentDateTime = new Date();
        }
      }
    }
  }
}