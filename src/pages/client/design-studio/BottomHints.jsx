import { NavIcon } from '../../../components/ui/icons';
import { T, TOOLS } from './dsShared';

export default function BottomHints({ tool }) {
  return (
    <div className="ds-hints">
      {[
        ['garmentType','Type'],['colorZone','Colors'],['logo','Logo'],
        ['text','Text'],['ai','AI'],['pattern','Pattern'],['order','Order'],
      ].map(([iconName,l],i)=>(
        <p key={i} style={{ fontSize:9,color:'rgba(15,23,42,.18)',margin:0,
          display:'flex',alignItems:'center',gap:3,whiteSpace:'nowrap' }}>
          <span style={{
            padding:'1px 5px',borderRadius:4, display:'flex', alignItems:'center',
            background: TOOLS.findIndex(t=>t.icon===iconName||t.label===l)===TOOLS.findIndex(t=>t.id===tool)
              ? T : 'transparent',
          }}>{iconName === 'order'
                ? <span style={{ fontSize:9 }}>→</span>
                : <NavIcon name={iconName} size={10}/>}</span>
          {l}
        </p>
      ))}
    </div>
  );
}
