export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

/**
 * Custom error class for Firestore permission issues.
 * Restructured to be extremely robust against transpiler issues with the 'super' keyword.
 * Properties are assigned strictly after super() to satisfy strict class lifecycle requirements.
 */
export class FirestorePermissionError extends Error {
  public context: SecurityRuleContext | undefined;

  constructor(context: SecurityRuleContext) {
    // Generate message before super call
    const message = context 
      ? `Missing or insufficient permissions: ${context.operation} at ${context.path}` 
      : "Missing or insufficient permissions";
    
    // Call super() first - this is mandatory and must be the first statement
    super(message);
    
    // Assign properties strictly after super()
    this.name = "FirestorePermissionError";
    this.context = context;
    
    // Ensure proper prototype chain
    Object.setPrototypeOf(this, FirestorePermissionError.prototype);
  }
}
