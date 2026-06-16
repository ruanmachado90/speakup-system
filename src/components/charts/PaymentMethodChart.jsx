import { useMemo } from 'react';
import { CreditCard, Banknote, Smartphone, Building, Receipt, ArrowLeftRight, FileText } from 'lucide-react';
import { formatCurrency } from '../../utils';

const PAYMENT_COLORS = {
  'Dinheiro': '#0e48fe',
  'Pix': '#fc6e1f',
  'PIX': '#fc6e1f',
  'Cartão de Crédito': '#ffae1e',
  'Cartão de Débito': '#f30961',
  'Boleto': 'rgba(14,72,254,0.45)',
  'Transferência Bancária': 'rgba(14,72,254,0.45)',
  'Cheque': '#d1d5db',
  'Não especificado': '#d1d5db'
};

const PAYMENT_ICONS = {
  'Dinheiro': Banknote,
  'Pix': Smartphone,
  'PIX': Smartphone,
  'Cartão de Crédito': CreditCard,
  'Cartão de Débito': CreditCard,
  'Boleto': Receipt,
  'Transferência Bancária': ArrowLeftRight,
  'Cheque': FileText,
  'Não especificado': Building
};

const PaymentMethodChart = ({ data, type = 'expense' }) => {
  // type: 'expense' para despesas, 'payment' para pagamentos
  const label = type === 'payment' ? 'pagamento' : 'despesa';
  const labelPlural = type === 'payment' ? 'pagamentos' : 'despesas';
  
  // Aggregate data by payment method
  const aggregatedData = useMemo(() => {
    const grouped = {};
    
    data.forEach(item => {
      const method = item.paymentMethod || 'Não especificado';
      // Para pagamentos, usar valuePaid ou valuePlanned; para despesas, usar value
      const value = type === 'payment' 
        ? Number(item.valuePaid || item.valuePlanned || 0)
        : Number(item.value || 0);
      
      if (!grouped[method]) {
        grouped[method] = { total: 0, count: 0 };
      }
      grouped[method].total += value;
      grouped[method].count += 1;
    });

    // Convert to array and sort by total
    return Object.entries(grouped)
      .map(([method, data]) => ({
        method,
        total: data.total,
        count: data.count,
        color: PAYMENT_COLORS[method] || '#64748b'
      }))
      .sort((a, b) => b.total - a.total);
  }, [data, type]);

  const totalAmount = useMemo(() => {
    return aggregatedData.reduce((sum, item) => sum + item.total, 0);
  }, [aggregatedData]);

  if (aggregatedData.length === 0) {
    return (
      <div className="py-12 text-center text-slate-400 text-sm">
        <Building size={32} className="mx-auto mb-2 opacity-50" />
        Sem dados para exibir
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Payment Methods List */}
      <div className="space-y-3">
        {aggregatedData.map((item, idx) => {
          const percentage = totalAmount > 0 ? (item.total / totalAmount * 100) : 0;
          const Icon = PAYMENT_ICONS[item.method] || Building;
          const n = aggregatedData.length;
          const barColor = idx === 0 ? '#0e48fe'
            : idx === 1 ? '#0e48fe'
            : idx === n - 1 ? '#d1d5db'
            : 'rgba(14,72,254,0.45)';
          
          return (
            <div key={item.method} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${item.color}20` }}
                  >
                    <Icon size={20} style={{ color: item.color }} />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-700 text-sm">
                      {item.method}
                    </div>
                    <div className="text-xs text-slate-500">
                      {item.count} {item.count === 1 ? label : labelPlural}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-800">
                    {formatCurrency(item.total)}
                  </div>
                  <div className="text-xs text-slate-500">
                    {percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full rounded-full overflow-hidden" style={{background:'#f3f4f6',height:6}}>
                <div 
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ 
                    width: `${percentage}%`,
                    backgroundColor: barColor
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Total Summary */}
      <div className="border-t pt-4 mt-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-slate-600">Total Geral</div>
          <div className="font-bold text-lg text-slate-800">
            {formatCurrency(totalAmount)}
          </div>
        </div>
        <div className="text-xs text-slate-500 text-right mt-1">
          {aggregatedData.reduce((sum, item) => sum + item.count, 0)} {labelPlural} no total
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodChart;
