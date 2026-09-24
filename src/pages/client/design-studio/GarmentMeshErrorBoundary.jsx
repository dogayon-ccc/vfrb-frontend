import { Component } from 'react';

// A missing or corrupt GLB throws during render; show the primitive mesh instead of blanking the app.
export default class GarmentMeshErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
