"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, Database, RefreshCw, Table } from "lucide-react";
import { ensureContentColumn } from "@/lib/memberships";

export default function DatabasePage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [columnResult, setColumnResult] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/db-init');
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || "Failed to initialize database");
      }
      
      setStatus(data);
    } catch (err: any) {
      console.error("Database initialization error:", err);
      setError(err.message || "An error occurred while initializing the database");
    } finally {
      setLoading(false);
    }
  };

  const addContentColumn = async () => {
    try {
      setAddingColumn(true);
      setColumnResult(null);
      
      const result = await ensureContentColumn();
      setColumnResult(result);
      
      // Refresh the status after adding the column
      if (result.success) {
        await fetchStatus();
      }
    } catch (err: any) {
      console.error("Error adding content column:", err);
      setColumnResult({ success: false, error: err.message });
    } finally {
      setAddingColumn(false);
    }
  };

  const testDatabaseInsert = async () => {
    try {
      setTestLoading(true);
      setTestResult(null);
      
      const response = await fetch('/api/test-db');
      const data = await response.json();
      
      setTestResult(data);
    } catch (err: any) {
      console.error("Error testing database:", err);
      setTestResult({ 
        success: false, 
        error: err.message || "An error occurred during the database test" 
      });
    } finally {
      setTestLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="container py-10 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Database Status</h1>
        <Button 
          variant="outline" 
          onClick={fetchStatus} 
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </>
          )}
        </Button>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {loading && !status && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Loading Database Status...
            </CardTitle>
          </CardHeader>
        </Card>
      )}
      
      {status && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Database Initialization</CardTitle>
              <CardDescription>{status.message}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatusItem 
                  title="Subscription Tiers" 
                  count={status.status.subscription_tiers} 
                  expected={3} 
                />
                <StatusItem 
                  title="Users" 
                  count={status.status.users} 
                />
                <StatusItem 
                  title="Subscriptions" 
                  count={status.status.subscriptions} 
                />
                <StatusItem 
                  title="Generations" 
                  count={status.status.generations} 
                />
              </div>
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                {status.status.subscription_tiers >= 3 
                  ? "Database schema is set up correctly."
                  : "Database initialization might be incomplete. Click Initialize button below to fix it."}
              </p>
            </CardFooter>
          </Card>
          
          <div className="flex flex-col gap-4">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Database Maintenance</CardTitle>
                <CardDescription>Fix common database issues</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  {columnResult && (
                    <Alert variant={columnResult.success ? "default" : "destructive"} className="mb-4">
                      <AlertDescription>
                        {columnResult.success 
                          ? "Successfully added content column to generations table."
                          : `Failed to add content column: ${columnResult.error}`}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium">Add Content Column</h3>
                      <p className="text-sm text-muted-foreground">
                        Add missing 'content' column to generations table for storing full generated content
                      </p>
                    </div>
                    <Button 
                      onClick={addContentColumn} 
                      disabled={addingColumn}
                      size="sm"
                    >
                      {addingColumn ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Table className="mr-2 h-4 w-4" />
                          Add Column
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium">Test Database Insert</h3>
                      <p className="text-sm text-muted-foreground">
                        Test if the database can accept new records
                      </p>
                    </div>
                    <Button 
                      onClick={testDatabaseInsert} 
                      disabled={testLoading}
                      size="sm"
                    >
                      {testLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Database className="mr-2 h-4 w-4" />
                          Run Test
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {testResult && (
                    <Alert variant={testResult.success ? "default" : "destructive"} className="mt-4">
                      <AlertTitle>{testResult.success ? "Test Successful" : "Test Failed"}</AlertTitle>
                      <AlertDescription>
                        {testResult.success 
                          ? "Successfully inserted a test record into the database."
                          : `Failed to insert test record: ${testResult.error || "Unknown error"}`}
                        
                        {testResult.details && (
                          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                            {JSON.stringify(testResult.details, null, 2)}
                          </pre>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-end">
              <Button 
                onClick={fetchStatus} 
                disabled={loading}
              >
                <Database className="mr-2 h-4 w-4" />
                Initialize Database
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatusItem({ title, count, expected }: { title: string, count: number, expected?: number }) {
  const isWarning = expected !== undefined && count < expected;
  
  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <p className={`text-2xl font-bold ${isWarning ? "text-destructive" : ""}`}>
        {count}
        {expected && ` / ${expected}`}
      </p>
      {isWarning && (
        <p className="text-xs text-destructive mt-1">Missing data</p>
      )}
    </div>
  );
}
