
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
    label: string;
    value: string | number;
    subtext: string;
    icon: LucideIcon;
    colorClass: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, subtext, icon: Icon, colorClass }) => (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-between group hover:shadow-lg transition-all">
        <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
            <p className={`text-4xl font-black mt-1 ${colorClass.split(' ')[0]}`}>{value}</p>
            <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase">{subtext}</p>
        </div>
        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${colorClass.split(' ')[1] || 'bg-slate-50 text-slate-400'}`}>
            <Icon className="h-7 w-7" />
        </div>
    </div>
);

export default StatCard;
