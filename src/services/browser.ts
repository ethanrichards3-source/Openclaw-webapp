import { BrowserAction, BrowserSession } from '../types';

/**
 * Browser automation service.
 * Uses a WebView-based approach for in-app browsing and content extraction.
 * Actions are queued and executed sequentially.
 */
export class BrowserService {
  private sessions: BrowserSession[] = [];
  private activeSessionId: string | null = null;
  private webViewRef: any = null; // React Native WebView ref
  private actionQueue: BrowserAction[] = [];
  private processing = false;

  setWebViewRef(ref: any) {
    this.webViewRef = ref;
  }

  createSession(url: string): BrowserSession {
    const session: BrowserSession = {
      id: `browser-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      url,
      actions: [],
      createdAt: Date.now(),
      isActive: true,
    };
    this.sessions.push(session);
    this.activeSessionId = session.id;
    return session;
  }

  getActiveSession(): BrowserSession | null {
    return this.sessions.find(s => s.id === this.activeSessionId) || null;
  }

  getAllSessions(): BrowserSession[] {
    return [...this.sessions];
  }

  closeSession(id: string) {
    this.sessions = this.sessions.map(s =>
      s.id === id ? { ...s, isActive: false } : s
    );
    if (this.activeSessionId === id) {
      this.activeSessionId = this.sessions.find(s => s.isActive)?.id || null;
    }
  }

  async executeAction(action: Omit<BrowserAction, 'id' | 'status' | 'timestamp'>): Promise<BrowserAction> {
    const fullAction: BrowserAction = {
      ...action,
      id: `action-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      status: 'pending',
      timestamp: Date.now(),
    };

    const session = this.getActiveSession();
    if (session) {
      session.actions.push(fullAction);
    }

    return this.processAction(fullAction);
  }

  private async processAction(action: BrowserAction): Promise<BrowserAction> {
    action.status = 'running';

    try {
      switch (action.type) {
        case 'navigate':
          action.result = await this.navigate(action.target || '');
          break;
        case 'extract':
          action.result = await this.extractContent(action.target);
          break;
        case 'click':
          action.result = await this.clickElement(action.target || '');
          break;
        case 'type':
          action.result = await this.typeText(action.target || '', action.value || '');
          break;
        case 'screenshot':
          action.result = await this.takeScreenshot();
          break;
        case 'script':
          action.result = await this.executeScript(action.value || '');
          break;
      }
      action.status = 'completed';
    } catch (error) {
      action.status = 'failed';
      action.result = error instanceof Error ? error.message : String(error);
    }

    return action;
  }

  private async navigate(url: string): Promise<string> {
    if (!url.startsWith('http')) {
      url = `https://${url}`;
    }

    if (this.webViewRef?.current) {
      this.webViewRef.current.injectJavaScript(`window.location.href = '${url}';`);
      const session = this.getActiveSession();
      if (session) session.url = url;
      return `Navigated to ${url}`;
    }

    // Fallback: fetch content directly
    const response = await fetch(url);
    const html = await response.text();
    const title = html.match(/<title>(.*?)<\/title>/i)?.[1] || url;
    const session = this.getActiveSession();
    if (session) {
      session.url = url;
      session.title = title;
    }
    return `Fetched: ${title} (${html.length} chars)`;
  }

  private async extractContent(selector?: string): Promise<string> {
    const session = this.getActiveSession();
    if (!session) return 'No active session';

    if (this.webViewRef?.current) {
      return new Promise((resolve) => {
        const js = selector
          ? `document.querySelector('${selector}')?.textContent || 'Element not found'`
          : `document.body.innerText.substring(0, 5000)`;
        this.webViewRef.current.injectJavaScript(
          `window.ReactNativeWebView.postMessage(JSON.stringify({type:'extract',data:${js}}));true;`
        );
        // WebView message handler will resolve this
        setTimeout(() => resolve('Extraction initiated - check WebView response'), 3000);
      });
    }

    // Fallback: re-fetch and extract
    try {
      const response = await fetch(session.url);
      const html = await response.text();
      // Simple HTML to text conversion
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 5000);
      return text;
    } catch (error) {
      return `Failed to extract: ${error}`;
    }
  }

  private async clickElement(selector: string): Promise<string> {
    if (this.webViewRef?.current) {
      this.webViewRef.current.injectJavaScript(
        `document.querySelector('${selector}')?.click(); true;`
      );
      return `Clicked: ${selector}`;
    }
    return 'WebView not available for click actions';
  }

  private async typeText(selector: string, text: string): Promise<string> {
    if (this.webViewRef?.current) {
      const escapedText = text.replace(/'/g, "\\'");
      this.webViewRef.current.injectJavaScript(
        `var el = document.querySelector('${selector}'); if(el){el.value='${escapedText}'; el.dispatchEvent(new Event('input',{bubbles:true}));} true;`
      );
      return `Typed into: ${selector}`;
    }
    return 'WebView not available for type actions';
  }

  private async takeScreenshot(): Promise<string> {
    if (this.webViewRef?.current?.capture) {
      const uri = await this.webViewRef.current.capture();
      return `Screenshot saved: ${uri}`;
    }
    return 'Screenshot not available (no WebView capture support)';
  }

  private async executeScript(script: string): Promise<string> {
    if (this.webViewRef?.current) {
      this.webViewRef.current.injectJavaScript(`${script}; true;`);
      return 'Script executed';
    }
    return 'WebView not available for script execution';
  }

  /**
   * Parse a natural language browser command into actions.
   */
  parseCommand(command: string): Omit<BrowserAction, 'id' | 'status' | 'timestamp'> | null {
    const lower = command.toLowerCase();

    if (lower.startsWith('go to ') || lower.startsWith('navigate to ') || lower.startsWith('open ')) {
      const url = command.replace(/^(go to|navigate to|open)\s+/i, '').trim();
      return { type: 'navigate', target: url };
    }

    if (lower.startsWith('extract') || lower.startsWith('get content') || lower.startsWith('read page')) {
      const selector = command.replace(/^(extract|get content|read page)\s*(from)?\s*/i, '').trim() || undefined;
      return { type: 'extract', target: selector };
    }

    if (lower.startsWith('click ')) {
      const selector = command.replace(/^click\s+/i, '').trim();
      return { type: 'click', target: selector };
    }

    if (lower.startsWith('type ')) {
      const match = command.match(/type\s+"(.+?)"\s+(?:in|into)\s+(.+)/i);
      if (match) {
        return { type: 'type', target: match[2].trim(), value: match[1] };
      }
    }

    if (lower.includes('screenshot')) {
      return { type: 'screenshot' };
    }

    if (lower.startsWith('run ') || lower.startsWith('execute ')) {
      const script = command.replace(/^(run|execute)\s+/i, '').trim();
      return { type: 'script', value: script };
    }

    return null;
  }
}

let browserInstance: BrowserService | null = null;

export function getBrowserService(): BrowserService {
  if (!browserInstance) {
    browserInstance = new BrowserService();
  }
  return browserInstance;
}
