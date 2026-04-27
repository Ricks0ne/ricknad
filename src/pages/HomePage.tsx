
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import BaseMetrics from "@/components/dashboard/BaseMetrics";
import WalletScanner from "@/components/wallet/WalletScanner";

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const handleChatClick = () => {
    navigate('/chat');
  };

  return (
    <div>
      <div className="flex flex-col items-center justify-center text-center mb-10 pt-10">
        <h1 className="text-5xl font-bold text-base-primary mb-4">Welcome to Based Ricks 👨‍🔬</h1>
        <p className="text-lg text-gray-600 italic">
          Generate smart contracts & ask Base AI anything
        </p>
      </div>

      <WalletScanner />

      <div className="grid grid-cols-1 gap-6 mt-10 max-w-5xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Unified AI Chat</CardTitle>
            <CardDescription>
              Generate contracts & ask questions in one chat interface
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleChatClick}
            >
              <MessageSquare className="mr-2 h-5 w-5" />
              Open Base AI Chat
            </Button>
          </CardContent>
        </Card>

        <BaseMetrics />
      </div>
    </div>
  );
};

export default HomePage;
