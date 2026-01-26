"use client"

import { User, Mail, Crown, Smile, Meh, Frown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import type { ProfileInformationCardProps } from '@/lib/types';
import { Loader } from './custom-loader';
import { Badge } from '../ui/badge';

interface PropsUtil {
  data: ProfileInformationCardProps | undefined;
  loading: boolean;
}

export const ProfileInformationCard: React.FC<PropsUtil> = ({data, loading}) => {
  const getSubscriptionColor = (type: string) => {
    switch (type) {
      case 'SILVER':
        return 'bg-gradient-to-r from-gray-400 to-gray-600 text-white border-gray-300';
      case 'GOLD':
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-yellow-300';
      case 'PLATINUM':
        return 'bg-gradient-to-r from-blue-400 to-blue-600 text-white border-blue-300';
      default:
        return 'bg-gradient-to-r from-gray-400 to-gray-600 text-white border-gray-300';
    }
  };

  const getSubscriptionIcon = (type: string) => {
    return <Crown className="h-5 w-5" />;
  };

  const getWalletIcon = (balance: number) => {
    if (balance < 10000) {
      return <Frown className="h-6 w-6 text-red-400" />;
    } else if (balance <= 30000) {
      return <Meh className="h-6 w-6 text-yellow-400" />;
    } else {
      return <Smile className="h-6 w-6 text-green-400" />;
    }
  };

  const getWalletStatusColor = (balance: number) => {
    if (balance < 10000) {
      return 'text-red-400';
    } else if (balance <= 30000) {
      return 'text-yellow-400';
    } else {
      return 'text-green-400';
    }
  };

   if(loading || !data){
    return (
      <Card className='row-span-2'>
    <Loader />
      </Card>
    )
  }

  return (
    <Card className="card-bg border-slate-700 row-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-emerald-500">
          <User className="h-5 w-5" />
          Profile Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-lg">
            <User className="h-8 w-8 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">
              {data.firstName} {data.lastName}
            </h3>
            <p className="flex items-center gap-1 text-slate-300">
              <Mail className="h-4 w-4" />
              {data.email}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-600 py-2">
            <span className="text-slate-300">First Name</span>
            <span className="font-medium text-white">{data.firstName}</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-600 py-2">
            <span className="text-slate-300">Last Name</span>
            <span className="font-medium text-white">{data.lastName}</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-600 py-2">
            <span className="text-slate-300">Email</span>
            <span className="font-medium text-white">{data.email}</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-600 py-2">
            <span className="text-slate-300">Phone</span>
            <span className="font-medium text-white">
             {data.phone || "Not Added"}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-600 py-2">
            <span className="text-slate-300">Date Joined</span>
            <span className="font-medium text-white">
              {formatDate(data.date_joined)}
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="font-medium text-slate-300">Subscription</span>
            <Badge
              className={`${getSubscriptionColor(data.subscription_plan)} border-2 px-4 py-2 text-sm font-bold shadow-lg`}
            >
              {getSubscriptionIcon(data.subscription_plan)}
              <span className="space-x-1 uppercase tracking-wide">
                <span className="ml-2 text-xs">
                  {' '}
                  {data?.subscription_plan || "ABCD"}{' '}
                </span>
              </span>
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
